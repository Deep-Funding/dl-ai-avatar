'use server';

import { getPool } from '@/lib/db'; // Ensure you created this in db.ts
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'labs-463322';
const REGION = 'us-central1';
const EMBEDDING_MODEL = 'text-embedding-005';
const OUTPUT_DIM = 256;

const ALLOWED_HOSTNAMES = [
  'deepfunding.ai',
  'deep-communities.ai',
  'df-manual.gitbook.io',
];

export type RetrievedContext = {
  combinedContext: string;
  chunks: Array<{
    url: string;
    text: string;
    summary: string | null;
    score: number;
    timestamp: string;
  }>;
};

// ---------------- AUTH ----------------
let authClient: any = null;

async function getAuthToken(): Promise<string> {
  if (!authClient) {
    authClient = await new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    }).getClient();
  }
  const token = await authClient.getAccessToken();
  return token.token!;
}

// ---------------- EMBEDDING ----------------
async function embedQuery(query: string): Promise<number[]> {
  const token = await getAuthToken();

  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${EMBEDDING_MODEL}:predict`;

  const body = {
    instances: [
      {
        task_type: 'RETRIEVAL_QUERY',
        content: query,
      },
    ],
    parameters: {
      outputDimensionality: OUTPUT_DIM,
      autoTruncate: true,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Embedding failed: ${await resp.text()}`);
  }

  const json = await resp.json();
  return json.predictions[0].embeddings.values;
}

// ---------------- SIMILARITY ----------------
function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }

  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function isAllowedSource(url: string) {
  try {
    return ALLOWED_HOSTNAMES.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

// ---------------- MAIN: Postgres Context Retrieval ----------------
export async function getContextForQuery(query: string, options: { topK?: number; minScore?: number } = {}) {
  const topK = options.topK ?? 8;

  const pool = getPool();
  const embedding = await embedQuery(query);
  const embeddingVector = embedding.join(',');

  const { rows } = await pool.query(
    `
    SELECT 
      url,
      text,
      summary,
      timestamp,
      1 - (embedding <=> $1::vector) +
      (EXTRACT(EPOCH FROM (NOW() - timestamp)) * -0.00000002)
        AS base_score
    FROM vector_chunks
    ORDER BY embedding <=> $1::vector
    LIMIT $2;
    `,
    [embeddingVector, topK * 3] // fetch more for reranking
  );

  const SOURCE_WEIGHTS: Record<string, number> = {
    'deepfunding.ai': 1.0,
    'deep-communities.ai': 0.85,
    'df-manual.gitbook.io': 1.15,
  };

  // rerank + dedupe
  const reranked = rows.map((row) => {
    const host = new URL(row.url).hostname;
    const weight = SOURCE_WEIGHTS[host] ?? 1.0;

    let score = row.base_score * weight;

    // keyword bonus
    const lowerQ = query.toLowerCase();
    if (row.text.toLowerCase().includes(lowerQ)) score += 0.05;
    if (row.summary?.toLowerCase().includes(lowerQ)) score += 0.03;

    return { ...row, score };
  });

  const sorted = reranked
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const combinedContext = sorted
    .map(
      (c, idx) =>
        `[DOC ${idx + 1}] ${c.url}
Score: ${c.score.toFixed(3)}
Time: ${c.timestamp}

${c.text}`
    )
    .join('\n\n-----\n\n');

  return {
    combinedContext,
    chunks: sorted,
  };
}


export async function retrieveContext(query: string): Promise<string> {
  const ctx = await getContextForQuery(query);
  return ctx?.combinedContext ?? '';
}