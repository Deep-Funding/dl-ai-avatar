// src/lib/context-retriever.ts
'server-only';

import { getDb } from '@/lib/firebase-admin';
import { GoogleAuth } from 'google-auth-library';

// === CONFIG ===
const PROJECT_ID = "labs-463322";
const REGION = "us-central1";
const EMBEDDING_MODEL = "text-embedding-005";
const OUTPUT_DIMENSIONALITY = 256;
const CHUNKS_COLLECTION = "vector_chunks";
const TOP_K = 8; // Increased for richer context
const SIMILARITY_THRESHOLD = 0.6; // Tune: 0.5-0.7; higher = stricter
const KEYWORD_BOOST_TERMS = ['funded', 'awarded', 'proposal', 'RFP', 'circle', 'grant']; // Add site-specific

// ... (keep your embedQuery function unchanged—it's solid!)

/**
 * Computes cosine similarity between two vectors.
 * @param vecA First vector (array of numbers).
 * @param vecB Second vector.
 * @returns Similarity score (0-1).
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB) || 0; // Avoid div-by-zero
}

/**
 * Retrieves relevant context from Firestore using vector similarity.
 * @param query The user's question.
 * @returns Formatted string with top relevant chunks + metadata.
 */
export async function retrieveContext(query: string): Promise<string> {
  const db = getDb();
  const queryEmbedding = await embedQuery(query);
  console.log(`[Context Retriever] Query "${query}" embedded; searching for similar chunks.`);

  const vectorChunksCollection = db.collection(CHUNKS_COLLECTION);
  
  // Step 1: Fetch all chunks (or paginate for large DB; assume <10k for now)
  const allDocs = await vectorChunksCollection.get();
  if (allDocs.empty) {
    console.log('[Context Retriever] No chunks in DB.');
    return '';
  }

  const allChunks = allDocs.docs.map(doc => ({
    id: doc.id,
    data: doc.data() as { text: string; embedding: number[]; source: string; url: string }, // Type your schema
    score: 0, // Placeholder
  }));

  console.log(`[Context Retriever] Loaded ${allChunks.length} total chunks from Firestore.`);

  // Step 2: Compute similarities
  const scoredChunks = allChunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.data.embedding),
  }));

  // Step 3: Hybrid boost—if low vector hits, filter by keywords
  let relevantChunks = scoredChunks
    .filter(chunk => chunk.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  if (relevantChunks.length < 3) {
    console.log('[Context Retriever] Low vector matches; applying keyword boost.');
    const keywordMatches = allChunks
      .filter(chunk => KEYWORD_BOOST_TERMS.some(term => chunk.data.text.toLowerCase().includes(term)))
      .map(chunk => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.data.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K / 2); // Supplement, don't overwhelm

    // Merge and dedup (simple: take union, re-sort)
    const mergedSet = new Set([...relevantChunks, ...keywordMatches].map(c => c.id));
    relevantChunks = Array.from(mergedSet).map(id => 
      scoredChunks.find(c => c.id === id)!
    ).sort((a, b) => b.score - a.score).slice(0, TOP_K);
  }

  console.log(`[Context Retriever] Retrieved ${relevantChunks.length} relevant chunks (top scores: ${relevantChunks.slice(0, 3).map(c => c.score.toFixed(3)).join(', ')}).`);

  if (relevantChunks.length === 0) {
    return '';
  }

  // Step 4: Format context with metadata for better LLM use
  const context = relevantChunks
    .map(chunk => 
      `**Source:** ${chunk.data.source}\n**URL:** ${chunk.data.url}\n**Relevance Score:** ${chunk.score.toFixed(3)}\n**Text:** ${chunk.data.text}`
    )
    .join('\n\n---\n\n');

  return context;
}
