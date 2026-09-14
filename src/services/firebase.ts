import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Firestore dengan Database ID khusus jika tersedia
const customDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-presensipklsmk-8eff2682-8acd-4b71-b845-229e818281f0';
export const db = customDbId && customDbId !== '(default)'
  ? getFirestore(app, customDbId)
  : getFirestore(app);

export const auth = getAuth(app);
export default app;
