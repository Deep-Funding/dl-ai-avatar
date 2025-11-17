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
  You are an expert AI assistant for DeepFunding, a community-governed funding platform for the Cardano ecosystem. Your goal is to answer user questions accurately based *only* on the context provided below.
  Your response will be displayed in a chat interface, so format it for readability (e.g., using markdown for lists or bold text). If the context is empty or does not contain the answer, state that you do not have enough information to answer the question.
  
  CONTEXT:
  ---
  ${context}
  ---
  
  QUESTION:
  "${question}"
  
  ANSWER:`;

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
