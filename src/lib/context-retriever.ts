'use server';

import { getPool } from '@/lib/db'; // your postgres pool factory
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

// ---------------- AUTH (Vertex AI token) ----------------
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
    const b = await resp.text().catch(() => '');
    throw new Error(`Embedding failed: ${resp.status} ${b}`);
  }

  const json = await resp.json();
  const values = json?.predictions?.[0]?.embeddings?.values;
  if (!Array.isArray(values)) {
    throw new Error('Embedding response missing embeddings.values');
  }

  return values;
}

// ---------------- UTILS ----------------
function isAllowedHostname(url: string) {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_HOSTNAMES.includes(host);
  } catch {
    return false;
  }
}

const SOURCE_WEIGHTS: Record<string, number> = {
  'deepfunding.ai': 1.0,
  'deep-communities.ai': 0.9,
  'df-manual.gitbook.io': 1.05,
};

// ---------------- MAIN: Postgres RAG retriever ----------------
export async function getContextForQuery(
  query: string,
  options: { topK?: number; minScore?: number } = {}
): Promise<RetrievedContext | null> {
  const topK = options.topK ?? 8;
  const minScore = typeof options.minScore === 'number' ? options.minScore : 0.4;

  const pool = getPool();

  // 1) embed query
  const queryEmbedding = await embedQuery(query);

  // pgvector expects a vector literal like: '[0.1,0.2,...]'
  const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

  // fetch a superset of candidates (we will rerank & filter in-app)
  // we fetch more than topK to allow post-filtering by hostname and weighting
  const fetchCount = Math.max(topK * 4, 50);

  const sql = `
    SELECT
      id,
      url,
      text,
      summary,
      timestamp,
      embedding <=> $1::vector AS distance  -- lower is better
    FROM vector_chunks
    ORDER BY embedding <=> $1::vector
    LIMIT $2;
  `;

  let rows: any[] = [];
  try {
    const { rows: raw } = await pool.query(sql, [embeddingLiteral, fetchCount]);
    rows = raw ?? [];
  } catch (err) {
    console.error('[RAG] Postgres query failed', (err as any)?.message ?? err);
    throw err;
  }

  if (!rows.length) {
    console.log('[RAG] No candidate rows returned from Postgres.');
    return null;
  }

  // 2) rerank & score: convert distance -> similarity score (0..1)
  //    We'll use score = 1 - distance (safe if distances are in [0,2] for pgvector cosine)
  const candidates = rows
    .map((r) => {
      const url = String(r.url ?? '');
      const text = String(r.text ?? '');
      const summary = r.summary ?? null;
      const ts = r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString();
      const distance = typeof r.distance === 'number' ? r.distance : Number(r.distance ?? 1);

      // convert to similarity (clamp)
      let sim = 1 - distance;
      if (!Number.isFinite(sim)) sim = 0;

      // apply source weight
      let host = '[unknown]';
      try {
        host = new URL(url).hostname;
      } catch {
        /* ignore */
      }
      const weight = SOURCE_WEIGHTS[host] ?? 1.0;
      const weighted = sim * weight;

      // small heuristics: give a tiny boost if query tokens found in text/summary
      const ql = query.toLowerCase();
      let bonus = 0;
      if (text.toLowerCase().includes(ql)) bonus += 0.03;
      if (summary && summary.toLowerCase().includes(ql)) bonus += 0.02;

      const score = Math.min(1, Math.max(-1, weighted + bonus));

      return {
        url,
        text,
        summary,
        timestamp: ts,
        distance,
        score,
        host,
      };
    })
    // keep only allowed hosts (post-filter)
    .filter((c) => ALLOWED_HOSTNAMES.includes(c.host))
    // remove NaN or invalid score items
    .filter((c) => Number.isFinite(c.score));

  if (!candidates.length) {
    console.log('[RAG] No candidates after host filtering.');
    return null;
  }

  // 3) final sort + minScore filter + de-dup by url
  const deduped: Record<string, any> = {};
  for (const c of candidates) {
    if (!deduped[c.url] || deduped[c.url].score < c.score) {
      deduped[c.url] = c;
    }
  }
  const finalList = Object.values(deduped)
    .sort((a: any, b: any) => b.score - a.score)
    .filter((c: any) => c.score >= minScore)
    .slice(0, topK);

  if (!finalList.length) {
    console.log(`[RAG] No chunks above minScore (${minScore}).`);
    return null;
  }

  // 4) build combinedContext (string) and return structured chunks
  const combinedContext = finalList
    .map(
      (c: any, idx: number) =>
        `[DOC ${idx + 1}] URL: ${c.url}\nScore: ${c.score.toFixed(3)}\nTimestamp: ${c.timestamp}\nContent:\n${c.text}`
    )
    .join('\n\n-----\n\n');

  const chunks = finalList.map((c: any) => ({
    url: c.url,
    text: c.text,
    summary: c.summary ?? null,
    score: c.score,
    timestamp: c.timestamp,
  }));

  console.log(`[RAG] Returning ${chunks.length} chunks (topK=${topK}, minScore=${minScore}).`);

  return {
    combinedContext,
    chunks,
  };
}

// backwards compat
export async function retrieveContext(query: string): Promise<string> {
  const r = await getContextForQuery(query);
  return r?.combinedContext ?? '';
}