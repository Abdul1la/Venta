// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCROmI5S9CITU05Bi_07Fqcv3uDPfKZcUE",
  authDomain: "venta-e740c.firebaseapp.com",
  projectId: "venta-e740c",
  storageBucket: "venta-e740c.firebasestorage.app",
  messagingSenderId: "703159297432",
  appId: "1:703159297432:web:d60a439e6807118d2937ed",
  measurementId: "G-356E24WLC7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, db, storage };
