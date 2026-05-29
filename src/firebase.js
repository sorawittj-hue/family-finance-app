// src/firebase.js
// ================================================
// วิธีตั้งค่า Firebase:
// 1. ไปที่ https://console.firebase.google.com
// 2. สร้าง Project ใหม่
// 3. เพิ่ม Web App แล้วคัดลอก firebaseConfig
// 4. เปิดใช้ Firestore Database (Start in test mode)
// 5. เปิดใช้ Authentication > Anonymous
// 6. สร้างไฟล์ .env ที่ root และใส่ค่า VITE_FIREBASE_* ตามตัวอย่างใน .env.example
// ================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = import.meta.env.VITE_APP_ID || 'family-finance-app';
