// // // src/lib/firebase-admin.ts
// // 'server-only';

// // import * as admin from 'firebase-admin';
// // import serviceAccount from '../service-account.json';

// // let db: admin.firestore.Firestore;

// // function initializeDb(): admin.firestore.Firestore {
// //   if (db) {
// //     return db;
// //   }
  
// //   try {
// //     if (!admin.apps.length) {
// //       // Manually construct the cert object and fix the private key
// //       const cert: admin.ServiceAccount = {
// //         projectId: serviceAccount.project_id,
// //         clientEmail: serviceAccount.client_email,
// //         privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
// //       };

// //       admin.initializeApp({
// //         credential: admin.credential.cert(cert),
// //       });
// //       console.log('Firebase Admin SDK initialized successfully.');
// //     }
  
// //     db = admin.firestore();
// //     return db;

// //   } catch (error: any) {
// //     console.error('Firebase Admin Initialization Error:', error);
// //     throw new Error(`Could not initialize Firebase Admin SDK. Error: ${error.message}`);
// //   }
// // }

// // // Export a getter function to ensure the db is initialized
// // export function getDb() {
// //   if (!db) {
// //     initializeDb();
// //   }
// //   return db;
// // }


// import { initializeApp, getApps, cert } from 'firebase-admin/app';
// import { getFirestore } from 'firebase-admin/firestore';
// import serviceAccount from '../service-account.json' assert { type: 'json' };

// let db: ReturnType<typeof getFirestore> | null = null;

// export function getDb() {
//   if (!getApps().length) {
//     initializeApp({
//       credential: cert({
//         projectId: serviceAccount.project_id,
//         clientEmail: serviceAccount.client_email,
//         privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
//       }),
//     });
//     console.log('✅ Firebase Admin SDK initialized');
//   }

//   if (!db) {
//     db = getFirestore();
//   }

//   return db;
// }


// src/lib/firebase-admin.ts
'server-only';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
// If your tsconfig has "resolveJsonModule": true, you don't need "assert"
import serviceAccount from '../service-account.json';

let app: App | null = null;
let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK initialized');
  }

  if (!db) {
    db = getFirestore();
  }

  return db;
}
