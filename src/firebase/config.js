import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
  collection,
  deleteDoc,
  doc,
  enableIndexedDbPersistence,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const auth = hasFirebaseConfig ? getAuth(app) : null;
export const db = hasFirebaseConfig ? getFirestore(app) : null;
export const googleProvider = hasFirebaseConfig ? new GoogleAuthProvider() : null;

if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => undefined);
}

export function enableFirestoreOffline() {
  if (!db) return Promise.resolve(false);
  return enableIndexedDbPersistence(db, { cacheSizeBytes: CACHE_SIZE_UNLIMITED })
    .then(() => true)
    .catch(() => false);
}

export const firebaseAuthApi = {
  signIn: (email, password) => {
    if (!auth) return Promise.reject(new Error("Firebase Auth не настроен"));
    return signInWithEmailAndPassword(auth, email, password);
  },
  signUp: (email, password) => {
    if (!auth) return Promise.reject(new Error("Firebase Auth не настроен"));
    return createUserWithEmailAndPassword(auth, email, password);
  },
  signInGoogle: () => {
    if (!auth || !googleProvider) return Promise.reject(new Error("Firebase Auth не настроен"));
    return signInWithPopup(auth, googleProvider);
  },
  signOut: () => {
    if (!auth) return Promise.resolve();
    return signOut(auth);
  }
};

export function listenUserCollection(storeName, userId, onChange, onError) {
  if (!db || !userId) return () => undefined;
  const ref = query(collection(db, storeName), where("userId", "==", userId), orderBy("updatedAt", "desc"));
  return onSnapshot(ref, (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, (error) => {
    onError?.(error);
  });
}

export function writeRemote(storeName, record) {
  if (!db) return Promise.resolve();
  return setDoc(doc(db, storeName, record.id), record, { merge: true });
}

export function deleteRemote(storeName, id) {
  if (!db) return Promise.resolve();
  return deleteDoc(doc(db, storeName, id));
}
