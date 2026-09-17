import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Firestore dengan Database ID jika dikonfigurasi, atau gunakan database default '(default)'
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;

function initDb() {
  try {
    if (typeof window !== 'undefined') {
      const dbOptions = {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      };
      return firestoreDbId && firestoreDbId !== '(default)'
        ? initializeFirestore(app, dbOptions, firestoreDbId)
        : initializeFirestore(app, dbOptions);
    }
  } catch {
    // Fallback jika sudah pernah diinisialisasi atau IndexedDB tidak didukung
  }

  return firestoreDbId && firestoreDbId !== '(default)'
    ? getFirestore(app, firestoreDbId)
    : getFirestore(app);
}

export const db = initDb();
export const auth = getAuth(app);
export default app;
