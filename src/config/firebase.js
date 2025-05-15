// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
const app = initializeApp(firebaseConfig);

// Inicjalizacja Firestore i Storage (bez Auth na razie)
const db = getFirestore(app);
const storage = getStorage(app);

// Eksportujemy placeholder dla auth, żeby reszta kodu nie wymagała zmian
const auth = null;

export { auth, db, storage }; 