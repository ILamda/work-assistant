// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWCNqD3zhG_FEnZx-54v8SDMqEb7sP2Ks",
  authDomain: "adhd-f85b0.firebaseapp.com",
  projectId: "adhd-f85b0",
  storageBucket: "adhd-f85b0.firebasestorage.app",
  messagingSenderId: "491098650505",
  appId: "1:491098650505:web:c830e9a64ef09268a31358"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);