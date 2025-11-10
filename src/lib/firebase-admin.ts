// // src/lib/firebase-admin.ts
// 'server-only';

// import * as admin from 'firebase-admin';
// import serviceAccount from '../service-account.json';

// let db: admin.firestore.Firestore;

// function initializeDb(): admin.firestore.Firestore {
//   if (db) {
//     return db;
//   }
  
//   try {
//     if (!admin.apps.length) {
//       // Manually construct the cert object and fix the private key
//       const cert: admin.ServiceAccount = {
//         projectId: serviceAccount.project_id,
//         clientEmail: serviceAccount.client_email,
//         privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
//       };

//       admin.initializeApp({
//         credential: admin.credential.cert(cert),
//       });
//       console.log('Firebase Admin SDK initialized successfully.');
//     }
  
//     db = admin.firestore();
//     return db;

//   } catch (error: any) {
//     console.error('Firebase Admin Initialization Error:', error);
//     throw new Error(`Could not initialize Firebase Admin SDK. Error: ${error.message}`);
//   }
// }

// // Export a getter function to ensure the db is initialized
// export function getDb() {
//   if (!db) {
//     initializeDb();
//   }
//   return db;
// }


import { initializeApp, getApps, cert, applicationDefault} from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db: ReturnType<typeof getFirestore> | null = null;

export function getDb() {
  if (!getApps().length) {
    //const projectId = process.env.GOOGLE_PROJECT_ID;
    //const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    //const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    //if (!projectId || !clientEmail || !privateKey) {
      //throw new Error('Missing Firebase environment variables');
    //}

    initializeApp({
      credential: applicationDefault(),
      // credential: cert({
      //   projectId,
      //   clientEmail,
      //   privateKey,
      // }),
    });

    console.log('✅ Firebase Admin SDK initialized with env vars');
  }

  if (!db) {
    db = getFirestore();
  }

  return db;
}
