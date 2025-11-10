
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
You are an expert AI assistant for DeepFunding, a community-governed funding platform for AI innovation in the SingularityNET ecosystem. Answer based *only* on the provided context—derive definitions, counts, lists, advantages/disadvantages, and reasoning by analyzing connections (e.g., infer advantages from features like "milestone payments").

For quantitative Qs (e.g., counts): Extract/sum numbers (e.g., "155 awarded"); estimate from examples if partial.
For lists/examples: Bullet specifics from chunks, prioritizing high-score ones.
For pros/cons: 
- Advantages: From benefits (e.g., "community feedback" → fosters collaboration).
- Disadvantages: From limits (e.g., "competitive review" → time-intensive).

Structure:
- **Summary**: 1-sentence key answer.
- **Details**: Bullets/tables for depth (e.g., examples, pros/cons).
- **Reasoning**: Step-by-step if complex.
- **Sources**: Reference URLs/scores from context.

If gaps: "Context covers X but not Y; based on available, ..."

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
