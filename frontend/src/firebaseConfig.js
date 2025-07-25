// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0J14b_kXjZ5S9PYYrLIah-G-kXvKwLjU",
  authDomain: "earth-engine-39d4f.firebaseapp.com",
  projectId: "earth-engine-39d4f",
  storageBucket: "earth-engine-39d4f.firebasestorage.app",
  messagingSenderId: "295347215800",
  appId: "1:295347215800:web:fd2a4bcb1b477ac22dc34d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };