import { initializeApp } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBdo3UdwfsEwAlwPdCupY4_Erp5oEszWWI",
  authDomain: "aoop-lab.firebaseapp.com",
  projectId: "aoop-lab",
  storageBucket: "aoop-lab.firebasestorage.app",
  messagingSenderId: "804270836698",
  appId: "1:804270836698:web:4d95e237b6867adc34cee3",
  measurementId: "G-WFEMHV74H6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { serverTimestamp };
