const admin = require('firebase-admin');

// --------------------------------------------------------------------------------
// IMPORTANT: Replace this with your own service account credentials
// You can download this JSON from the Firebase Console:
// Project Settings -> Service Accounts -> Generate New Private Key
// --------------------------------------------------------------------------------
const serviceAccount = require("./serviceAccountKey.json");


// OR use environment variables (Recommended for production)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // credential: admin.credential.applicationDefault()
      // If you have the json file locally:
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized successfully');
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

module.exports = admin;
