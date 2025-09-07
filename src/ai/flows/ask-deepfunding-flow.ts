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
  
  const augmentedPrompt = `You are a helpful assistant for DeepFunding. Answer USING ONLY the provided context.
If the answer is not in the context, please respond in a friendly and formal tone that you were unable to find the information in the documents you have access to. You can also suggest that the user rephrase the question or ask about another DeepFunding topic.

Question: ${input.question}

Context:
${context.map((c) => c.text).join('\n---\n')}

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
