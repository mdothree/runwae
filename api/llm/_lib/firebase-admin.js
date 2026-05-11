/**
 * Firebase Admin SDK singleton initialization
 * Used for server-side token verification and database access
 */

const admin = require('firebase-admin');

let app;

function getFirebaseAdmin() {
  if (app) {
    return app;
  }

  // Initialize Firebase Admin with environment variables
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Private key comes with escaped newlines from env var
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  return app;
}

function getDatabase() {
  getFirebaseAdmin();
  return admin.database();
}

function getAuth() {
  getFirebaseAdmin();
  return admin.auth();
}

module.exports = {
  getFirebaseAdmin,
  getDatabase,
  getAuth,
};
