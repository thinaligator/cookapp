// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwpgtCrn9KJ6E7x3Rwi8KGfKUcD3hZFbg",
  authDomain: "kucharz-app.firebaseapp.com",
  projectId: "kucharz-app",
  storageBucket: "kucharz-app.firebasestorage.app",
  messagingSenderId: "865968646104",
  appId: "1:865968646104:ios:e29524f565200afb59b4ad"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const app = initializeApp(firebaseConfig);

// Inicjalizacja Firestore, Storage i Auth
const db = getFirestore(app);
const storage = getStorage(app);
const auth = firebase.auth();

// Debugowanie Firebase Storage
console.log('Firebase Storage inicjalizacja:', {
  storageBucket: storage.app.options.storageBucket
});

export { auth, db, storage }; 