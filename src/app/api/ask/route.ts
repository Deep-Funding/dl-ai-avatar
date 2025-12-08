import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getContextForQuery } from '@/lib/context-retriever';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Build the final prompt with Mode B behavior (grounded but allowed to interpret)
const buildPrompt = (question: string, context: string, hasContext: boolean) => `
You are the "DeepFunding Guide", an AI assistant that explains the DeepFunding program,
its rules, processes, and ecosystem.

The CONTEXT is in English. The USER QUESTION may be in any language.
You must always respond in the **same language as the USER QUESTION**, even though you
are reasoning over English context.

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
- Do NOT mention the fact that you translated or that the context is in English; just answer naturally.

CONTEXT (from official DeepFunding-related sources):
${hasContext ? context : '*No matching context could be retrieved.*'}

USER QUESTION:
"${question}"

Now respond in this structure:

1. Direct answer.
2. Short explanation (mention when you are interpreting beyond the docs).
3. "Sources:" followed by 1–3 relevant URLs from the context which are always clickable, if any. If you only interpreted, write:
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
        score: c.score ?? null,
        timestamp: c.timestamp ?? null,
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
