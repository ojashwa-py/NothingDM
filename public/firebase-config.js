// Firebase Web Client Configuration
// Replace the values below with your Firebase project credentials from:
// Firebase Console -> Project Settings -> General -> Your apps -> Web app setup

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKfrzgljBIdlPJqI6bk-wMI8Cp5lZE9zM",
  authDomain: "ojashwa-nothing-automation.firebaseapp.com",
  projectId: "ojashwa-nothing-automation",
  storageBucket: "ojashwa-nothing-automation.firebasestorage.app",
  messagingSenderId: "323401747356",
  appId: "1:323401747356:web:385943194f58f1daec5659",
  measurementId: "G-X6Z4G7MBJZ"
};

// Initialize Firebase SDK for browser script tags
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
}