// src/app/api/ask/route.ts
import { askDeepFunding } from '@/ai/flows/ask-deepfunding-flow';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required and must be a string.' }, { status: 400 });
    }

    const answer = await askDeepFunding({ question });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error in /api/ask:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Sorry, something went wrong: ${errorMessage}` }, { status: 500 });
  }
}
