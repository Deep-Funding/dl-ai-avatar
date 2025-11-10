// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * This route handler is for testing the Firebase Admin SDK connection.
 * It attempts to list all collections in the Firestore database.
 */
export async function GET() {
  try {
    console.log('[API Test] Attempting to connect to Firestore...');
    
    // Fetch the list of all collections in Firestore
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('[API Test] Connection successful, but no collections were found.');
       return NextResponse.json({
        success: true,
        message: 'Successfully connected to Firestore, but your database has no collections yet.',
      });
    }

    // Extract the IDs of the collections
    const collectionIds = collections.map(col => col.id);
    
    console.log(`[API Test] Connection successful. Found collections: ${collectionIds.join(', ')}`);

    // Return a success response with the list of collections
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Firestore!',
      collections: collectionIds,
    });

  } catch (error: any) {
    console.error('[API Test Error]', error);
    
    // Return a detailed error message if the connection fails
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to connect to Firestore.',
        error: error.message,
        // Provide guidance on how to fix common issues
        troubleshooting: "Please ensure your `src/service-account.json` file is valid and has the correct permissions in your Firebase project.",
      },
      { status: 500 }
    );
  }
}
