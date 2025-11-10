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

/**
 * Generates a vector embedding for a given text query using the Vertex AI API.
 * @param query The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
async function embedQuery(query: string) {
  console.log(`[Context Retriever] Embedding query with Vertex AI: "${query}"`);

  // Auth: get access token for Vertex AI
  const auth = new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${EMBEDDING_MODEL}:predict`;

  // The request body for a singular query.
  const requestBody = {
    instances: [{
      task_type: "RETRIEVAL_QUERY",
      content: query,
    }],
    parameters: {
      outputDimensionality: OUTPUT_DIMENSIONALITY,
      autoTruncate: true,
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.token || ''}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Vertex AI error ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    if (!data.predictions || data.predictions.length === 0) {
      throw new Error("No predictions returned from Vertex AI");
    }

    const embeddings = data.predictions[0].embeddings?.values;
    if (!embeddings) {
      throw new Error("Missing embedding values in Vertex AI response");
    }
    
    console.log('[Context Retriever] Query embedded successfully via Vertex AI.');
    return embeddings;
  } catch (e: any) {
    console.error(`[Context Retriever ERROR] Embedding failed:`, e.message);
    throw e;
  }
}


/**
 * Retrieves relevant context from the Firestore database based on a user's query.
 * @param query The user's question.
 * @returns A string containing the combined text of the most relevant document chunks.
 */
export async function retrieveContext(query: string): Promise<string> {
  // Ensure the database is initialized
  const db = getDb();
  
  // 1. Embed the user's query using the new Vertex AI method
  const queryEmbedding = await embedQuery(query);

  // 2. Query Firestore for similar vectors
  // This is a placeholder for a proper vector similarity search implementation.
  // For a real application, you would use a dedicated vector database or a
  // Firestore extension like AlloyDB for vector search.
  const vectorChunksCollection = db.collection(CHUNKS_COLLECTION);
  const results = await vectorChunksCollection.limit(5).get();

  console.log(
    `[Context Retriever] Found ${results.docs.length} potential matches (using simplified retrieval).`
  );

  if (results.empty) {
    console.log('[Context Retriever] No matching documents found.');
    return '';
  }

  // 3. Combine the text from the retrieved documents
  const context = results.docs
    .map((doc) => doc.data().text)
    .join('\n\n---\n\n');
  console.log('[Context Retriever] Context retrieved and combined.');

  return context;
}
