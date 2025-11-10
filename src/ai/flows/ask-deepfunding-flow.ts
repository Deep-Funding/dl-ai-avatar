'use server';
/**
 * @fileOverview A flow that answers questions about DeepFunding based on a RAG system.
 *
 * - askDeepFunding - A function that takes a question and returns an answer.
 * - AskDeepFundingInput - The input type for the askDeepFunding function.
 * - AskDeepFundingOutput - The return type for the askDeepFunding function.
 */

import { z } from 'zod';
import { retrieve } from '@/ai/retriever';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const AskDeepFundingInputSchema = z.object({
  question: z.string().describe('The question to ask the AI.'),
});
export type AskDeepFundingInput = z.infer<typeof AskDeepFundingInputSchema>;

export type AskDeepFundingOutput = string;

const askDeepFundingFlow = async (
  input: AskDeepFundingInput
): Promise<AskDeepFundingOutput> => {
  const context = await retrieve(input.question);
  
  const augmentedPrompt = `
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
ANSWER:

Return a concise and conversational answer in a paragraph format.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(augmentedPrompt);
  const response = await result.response;
  return response.text();
};

export async function askDeepFunding(
  input: AskDeepFundingInput
): Promise<AskDeepFundingOutput> {
  return askDeepFundingFlow(input);
}
