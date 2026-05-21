import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_FIREBASE_AUTH_DOMAIN_PLACEHOLDER",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID_PLACEHOLDER",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET_PLACEHOLDER",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID_PLACEHOLDER"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
