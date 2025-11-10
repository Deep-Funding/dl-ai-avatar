
// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveContext } from '@/lib/context-retriever';

export const runtime = 'nodejs';

// This initializes the Google Generative AI client.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Creates a prompt for the AI model, augmented with context from the database.
 * @param question The user's question.
 * @param context The relevant context retrieved from the database.
 * @returns The complete prompt string.
 */
const getPrompt = (question: string, context: string) => `
You are an expert AI assistant for DeepFunding, a community-governed funding platform for the Cardano ecosystem. Your goal is to answer user questions accurately and intelligently based only on the context provided below. Do not use any external knowledge or assumptions—everything must be directly derived or logically inferred from the context.
To provide intelligent answers:

Analyze the context thoroughly: Extract definitions, key concepts, processes, relationships, advantages, disadvantages, implications, or examples by connecting relevant parts logically.
If the question asks for reasoning, advantages/disadvantages, comparisons, or deeper insights, infer them step-by-step from the context (e.g., if the context describes benefits of a feature, derive advantages; if it mentions limitations, derive disadvantages).
If the context supports it, provide comprehensive explanations, such as step-by-step processes, pros/cons lists, or reasoned conclusions.
If the context is empty, incomplete, or does not contain enough information to answer fully (including for inferences like pros/cons), state clearly: "I do not have enough information in the provided context to answer this question accurately." Do not speculate.

Your response will be displayed in a chat interface, so format it for readability and engagement (e.g., using markdown for bold text, lists, headings, or bullet points). Structure complex answers with sections like "Definition," "Advantages," "Disadvantages," or "Reasoning" when relevant.

CONTEXT:
---
${context}
---

QUESTION:
"${question}"

ANSWER:`;

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }
    
    console.log('[API] Received question:', question);
    
    // 1. Retrieve context from the database
    const context = await retrieveContext(question);

    // 2. Generate a response using the model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const prompt = getPrompt(question, context);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    console.log('[API] Answer generated.');

    // 3. Return the answer and the context (for debugging)
    return NextResponse.json({ answer, context });

  } catch (error: any) {
    console.error('[API Error]', error);
    // Return a generic error message to the client
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
