import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABgzr2L-lf6OKROV60vxt1okoAdX8Ww1I",
  authDomain: "ai-classroom-70c42.firebaseapp.com",
  projectId: "ai-classroom-70c42",
  appId: "1:885145009976:web:ad1b926dd567a1391bcbcd",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});