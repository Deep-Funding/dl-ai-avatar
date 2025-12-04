
// // src/app/api/ask/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import { retrieveContext } from '@/lib/context-retriever';

// export const runtime = 'nodejs';

// // This initializes the Google Generative AI client.
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// /**
//  * Creates a prompt for the AI model, augmented with context from the database.
//  * @param question The user's question.
//  * @param context The relevant context retrieved from the database.
//  * @returns The complete prompt string.
//  */
// const getPrompt = (question: string, context: string) => `
// You are an expert AI assistant for DeepFunding, a community-governed funding platform for the Cardano ecosystem. Your goal is to answer user questions accurately based *only* on the context provided below.

// Your response will be displayed in a chat interface, so format it for readability (e.g., using markdown for lists or bold text). If the context is empty or does not contain the answer, state that you do not have enough information to answer the question.

// CONTEXT:
// ---
// ${context}
// ---

// QUESTION:
// "${question}"

// ANSWER:`;

// export async function POST(req: NextRequest) {
//   try {
//     const { question } = await req.json();

//     if (!question) {
//       return NextResponse.json({ error: 'Question is required' }, { status: 400 });
//     }
    
//     console.log('[API] Received question:', question);
    
//     // 1. Retrieve context from the database
//     const context = await retrieveContext(question);

//     // 2. Generate a response using the model
//     const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
//     const prompt = getPrompt(question, context);
    
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const answer = response.text();

//     console.log('[API] Answer generated.');

//     // 3. Return the answer and the context (for debugging)
//     return NextResponse.json({ answer, context });

//   } catch (error: any) {
//     console.error('[API Error]', error);
//     // Return a generic error message to the client
//     return NextResponse.json(
//       { error: error.message || 'An unexpected error occurred.' },
//       { status: 500 }
//     );
//   }
// }


// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getContextForQuery } from '@/lib/context-retriever';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Build the final prompt with Mode B behavior (grounded but allowed to interpret)
const buildPrompt = (question: string, context: string, hasContext: boolean) => `
You are the "DeepFunding Guide", an AI assistant that explains the DeepFunding program,
its rules, processes, and ecosystem.

You must follow these rules:
- Primarily rely on the CONTEXT section below, which comes from official DeepFunding-related sources
  (deepfunding.ai, community.deepfunding.ai, df-manual.github.io).
- If the CONTEXT clearly answers the question, base your answer on it and do NOT contradict it.
- If the CONTEXT is missing or incomplete, you MAY use your own general knowledge to give a helpful explanation,
  but you must clearly mark those parts as interpretation (for example: "This part is an interpretation, not
  explicitly stated in the docs.").
- If the user asks about something clearly outside DeepFunding or SingularityNET, explain that you are specialised
  in DeepFunding and may not have complete information.
- Keep your answer concise but clear (around 3–8 sentences), using markdown for readability (lists, bold, etc.).

CONTEXT (from official DeepFunding-related sources):
${hasContext ? context : '*No matching context could be retrieved.*'}

USER QUESTION:
"${question}"

Now respond in this structure:

1. Direct answer.
2. Short explanation (mention when you are interpreting beyond the docs).
3. "Sources:" followed by 1–3 relevant URLs from the context, if any. If you only interpreted, write:
   "Sources: None (interpretation based on general knowledge)".
`;

/**
 * /api/ask — main RAG endpoint for the DeepFunding avatar
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body?.question ?? body?.query; // tolerate both keys

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string.' },
        { status: 400 }
      );
    }

    console.log('[API /ask] Received question:', question);

    // 1. Retrieve context (vector search over Firestore chunks)
    const contextResult = await getContextForQuery(question, {
      topK: 6,
      minScore: 0.55, // flexible but still somewhat relevant
    });

    const hasContext = !!contextResult;
    const contextText = contextResult?.combinedContext ?? '';

    // 2. Build prompt
    const prompt = buildPrompt(question, contextText, hasContext);

    // 3. Call Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

    console.log('[API /ask] Answer generated.');

    // 4. Shape response for the frontend (answer + context + sources)
    const sources =
      contextResult?.chunks.map((c) => ({
        url: c.url,
        score: c.score,
        timestamp: c.timestamp,
        summary: c.summary ?? null,
      })) ?? [];

    return NextResponse.json({
      answer,
      context: contextText, // raw combined context (optional, for debugging or UI)
      hasContext,
      sources,
    });
  } catch (error: any) {
    console.error('[API /ask] Error', error);
    return NextResponse.json(
      {
        error: error?.message || 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
