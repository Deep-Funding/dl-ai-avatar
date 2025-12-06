
'server-only';

import { getDb } from '@/lib/firebase-admin';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'labs-463322';
const REGION = 'us-central1';
const EMBEDDING_MODEL = 'text-embedding-005';
const OUTPUT_DIMENSIONALITY = 256;
const CHUNKS_COLLECTION = 'vector_chunks';
const RAG_ENABLED = process.env.NODE_ENV === 'production';

// Allowed DeepFunding-related hostnames
const ALLOWED_HOSTNAMES = [
  'deepfunding.ai',
  'deep-communities.ai',
  'df-manual.gitbook.io',
];

type ChunkDoc = {
  source: string;
  url: string;
  text: string;
  summary?: string;
  embedding: number[];
  timestamp: string;
};

export type RetrievedContext = {
  combinedContext: string;
  chunks: Array<{
    url: string;
    text: string;
    summary?: string;
    score: number;
    timestamp: string;
  }>;
};

// ----------------- Auth / Embedding -----------------

let authClient: any | null = null;

async function getAuthToken(): Promise<string> {
  if (!authClient) {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    authClient = await auth.getClient();
  }
  const token = await authClient.getAccessToken();
  return token.token || '';
}

/**
 * Generates a vector embedding for a given text query using the Vertex AI API.
 */
async function embedQuery(query: string): Promise<number[]> {
  console.log(`[Context Retriever] Embedding query with Vertex AI: "${query}"`);

  const token = await getAuthToken();
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${EMBEDDING_MODEL}:predict`;

  const requestBody = {
    instances: [
      {
        task_type: 'RETRIEVAL_QUERY',
        content: query,
      },
    ],
    parameters: {
      outputDimensionality: OUTPUT_DIMENSIONALITY,
      autoTruncate: true,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('[Context Retriever ERROR] Vertex AI error:', resp.status, errText);
    throw new Error(`Vertex AI error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  if (!data.predictions || data.predictions.length === 0) {
    throw new Error('No predictions returned from Vertex AI');
  }

  const embeddings = data.predictions[0].embeddings?.values;
  if (!embeddings) {
    throw new Error('Missing embedding values in Vertex AI response');
  }

  console.log('[Context Retriever] Query embedded successfully via Vertex AI.');
  return embeddings;
}

// ----------------- Similarity & filters -----------------

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function isAllowedSource(sourceUrl: string): boolean {
  try {
    const hostname = new URL(sourceUrl).hostname;
    return ALLOWED_HOSTNAMES.includes(hostname);
  } catch {
    return false;
  }
}

// ----------------- Main retrieval API -----------------

/**
 * Retrieves relevant context (with metadata) for a user's query.
 * Returns both the combined context string and the list of top chunks.
 */
export async function getContextForQuery(
  query: string,
  options?: { topK?: number; minScore?: number }
): Promise<RetrievedContext | null> {
  // 🔧 Disable RAG in dev to avoid auth hell
  if (!RAG_ENABLED) {
    console.log('[Context Retriever] RAG disabled in non-production environment.');
    return null;
  }

  const db = getDb();
  const topK = options?.topK ?? 10;
  const minScore = options?.minScore ?? 0.4; // flexible-but-grounded (mode B)

  // 1. Embed the user's query
  const queryEmbedding = await embedQuery(query);

  // 2. Fetch candidate chunks from Firestore
  // NOTE: Firestore is not a vector DB, so we approximate by:
  //   - limiting to recent N docs
  //   - computing cosine similarity on the app side
  const snapshot = await db
    .collection(CHUNKS_COLLECTION)
    //.orderBy('timestamp', 'desc')
    .limit(2000)
    .get();

  console.log(
    `[Context Retriever] Loaded ${snapshot.size} candidate chunks from Firestore.`
  );

  if (snapshot.empty) {
    console.log('[Context Retriever] No chunks in collection.');
    return null;
  }

  const candidates: ChunkDoc[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as any;
    if (!data.embedding || !Array.isArray(data.embedding)) return;
    if (!isAllowedSource(data.source)) return;

    candidates.push({
      source: data.source,
      url: data.url,
      text: data.text,
      summary: data.summary,
      embedding: data.embedding,
      timestamp: data.timestamp,
    });
  });

  if (!candidates.length) {
    console.log('[Context Retriever] No candidates from allowed sources.');
    return null;
  }

  // 3. Compute similarity scores
  const scored = candidates
    .map((c) => ({
      ...c,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (!scored.length) {
    console.log(
      `[Context Retriever] No chunks above similarity threshold (${minScore}).`
    );
    return null;
  }

  // 4. Build combined context for LLM
  const combinedContext = scored
    .map(
      (c, idx) =>
        `[DOC ${idx + 1}] URL: ${c.url}\nScore: ${c.score.toFixed(
          3
        )}\nTimestamp: ${c.timestamp}\nContent:\n${c.text}`
    )
    .join('\n\n-----\n\n');

  console.log(
    `[Context Retriever] Returning ${scored.length} chunks as context.`
  );

  return {
    combinedContext,
    chunks: scored.map((c) => ({
      url: c.url,
      text: c.text,
      summary: c.summary,
      score: c.score,
      timestamp: c.timestamp,
    })),
  };
}

/**
 * Backwards-compatible wrapper:
 * returns only the combined context string (as your original API did).
 */
export async function retrieveContext(query: string): Promise<string> {
  const result = await getContextForQuery(query);
  return result?.combinedContext ?? '';
}