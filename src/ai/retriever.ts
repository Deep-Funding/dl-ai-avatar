'use server';
/**
 * @fileOverview This file contains the implementation of the in-memory RAG retriever.
 * It fetches data from specified URLs on server startup, chunks it, creates embeddings,
 * and provides a function to retrieve relevant chunks for a given query.
 */
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

interface Chunk {
  text: string;
  metadata: { url: string };
}

interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

// In-memory vector store
let vectorStore: EmbeddedChunk[] = [];
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;


const DATA_SOURCES = [
  'https://df-manual.gitbook.io/df-book',
  'https://deepfunding.ai',
  'https://community.deepfunding.ai',
];

const MAX_PAGES_PER_SOURCE = 100; // Limit crawling to prevent excessive requests
const CHUNK_SIZE = 500; // In words (approx)
const CHUNK_OVERLAP = 50; // In words (approx)

async function crawlWebsite(baseUrl: string): Promise<{text: string, url: string}[]> {
  const visited = new Set<string>();
  const queue: string[] = [baseUrl];
  const allText: {text: string, url: string}[] = [];
  const domain = new URL(baseUrl).hostname;

  while (queue.length > 0 && visited.size < MAX_PAGES_PER_SOURCE) {
    const url = queue.shift();
    if (!url || visited.has(url)) {
      continue;
    }

    visited.add(url);
    console.log(`Crawling: ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
        continue;
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove non-content elements
      $('script, style, nav, footer, header, aside').remove();
      
      const text = $('body').text().replace(/\s\s+/g, ' ').trim();
      if (text) {
        allText.push({text, url});
      }

      // Find new links to crawl
      $('a').each((_, element) => {
        const link = $(element).attr('href');
        if (link) {
          try {
            const absoluteUrl = new URL(link, baseUrl).href.split('#')[0]; // Ignore fragments
            if (new URL(absoluteUrl).hostname === domain && !visited.has(absoluteUrl)) {
              queue.push(absoluteUrl);
            }
          } catch (e) {
            // Ignore invalid URLs
          }
        }
      });
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
    }
  }
  return allText;
}


async function chunkText(text: string, chunkSize: number, overlap: number): Promise<string[]> {
    const chunks: string[] = [];
    // A simple text splitter, not token-aware for simplicity
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks;
}


async function initializeVectorStore() {
    if (vectorStore.length > 0) {
        console.log('Vector store already initialized.');
        return;
    }
    if (isInitializing && initializationPromise) {
        console.log('Vector store initialization in progress, awaiting completion.');
        return initializationPromise;
    }
    if (isInitializing) { // Should not happen if promise is managed correctly
        console.log('Vector store is initializing but no promise found, re-attempting.');
    }

    isInitializing = true;
    initializationPromise = (async () => {
        try {
            console.log('Initializing vector store...');

            const allChunks: Chunk[] = [];

            for (const sourceUrl of DATA_SOURCES) {
                console.log(`Processing source: ${sourceUrl}`);
                const pages = await crawlWebsite(sourceUrl);
                
                for (const page of pages) {
                    const textChunks = await chunkText(page.text, CHUNK_SIZE, CHUNK_OVERLAP);
                    for (const text of textChunks) {
                        allChunks.push({ text, metadata: { url: page.url } });
                    }
                }
            }
            
            console.log(`Created ${allChunks.length} chunks. Now embedding...`);

            // Embed in batches to avoid overwhelming the embedding model API
            const batchSize = 100; // As per Gemini API recommendations
            for (let i = 0; i < allChunks.length; i += batchSize) {
                const batch = allChunks.slice(i, i + batchSize);
                const chunksToEmbed = batch.filter(c => c.text.trim() !== '');

                if (chunksToEmbed.length === 0) {
                    console.log(`Skipping batch starting at index ${i} as it contains no valid content.`);
                    continue;
                }

                try {
                    const { embeddings } = await embeddingModel.batchEmbedContents({
                        requests: chunksToEmbed.map(c => ({
                            content: { parts: [{ text: c.text }] },
                            taskType: TaskType.RETRIEVAL_DOCUMENT,
                        })),
                    });

                    for(let j=0; j < embeddings.length; j++) {
                         if (!embeddings[j]) {
                            console.warn(`Warning: No embedding returned for chunk ${i+j}. Skipping.`);
                            continue;
                        }
                        vectorStore.push({
                            ...chunksToEmbed[j],
                            embedding: embeddings[j].values,
                        });
                    }
                    console.log(`Embedded batch ${Math.ceil(i/batchSize) + 1}/${Math.ceil(allChunks.length/batchSize)}`);
                } catch (batchError) {
                    console.error(`Error embedding batch starting at index ${i}:`, batchError);
                }
            }
            
            console.log('Vector store initialized successfully.');
        } finally {
            isInitializing = false;
            initializationPromise = null; // Clear the promise regardless of outcome
        }
    })();

    return initializationPromise.catch(err => {
        console.error("Failed to initialize vector store:", err);
        // Ensure state is reset on failure
        isInitializing = false; 
        initializationPromise = null;
        throw err; // Re-throw to fail the retrieval
    });
}


// Simple cosine similarity function
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieve(query: string, topK = 5): Promise<Chunk[]> {
  if (vectorStore.length === 0) {
    await initializeVectorStore();
  }

  const result = await embeddingModel.embedContent({
      content: { parts: [{ text: query }] },
      taskType: TaskType.RETRIEVAL_QUERY,
  });
  const queryEmbedding = result.embedding.values;

  const scoredChunks = vectorStore.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, topK).map(c => ({ text: c.text, metadata: c.metadata }));
}

// Eagerly initialize the store on server start
initializeVectorStore().catch(console.error);
