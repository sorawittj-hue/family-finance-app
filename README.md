# 💰 บัญชีครอบครัว (Family Finance App)

แอปบันทึกบัญชีครอบครัวแบบ **Real-time** — ทุกคนในครอบครัวเห็นข้อมูลตรงกันทันที ไม่ว่าจะใช้อุปกรณ์ใด

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite) ![Firebase](https://img.shields.io/badge/Firebase-10-orange?logo=firebase) ![Tailwind](https://img.shields.io/badge/TailwindCSS-3-cyan?logo=tailwindcss)

## ✨ ฟีเจอร์

- 📊 **Dashboard สรุปรายเดือน** — รายรับ รายจ่าย เงินออม เงินคงเหลือ
- 🔄 **Real-time Sync** — ซิงค์ข้อมูลทุกเครื่องในครอบครัวผ่าน Firebase Firestore
- 📁 **หมวดหมู่ครบครัน** — อาหาร บ้าน รถ ลูก สุขภาพ หนี้สิน ช้อปปิ้ง ฯลฯ
- 📈 **แผนภูมิสัดส่วน** — เห็นได้ทันทีว่าเงินไปอยู่ที่ไหน
- 📅 **กรองตามเดือน** — ดูประวัติย้อนหลังได้ทุกเดือน
- 📥 **Export CSV** — ส่งออกเป็น Excel ได้เลย
- 🗑️ **ลบรายการ** — พร้อม Confirm Modal ป้องกันลบผิด
- 📱 **Responsive** — ใช้งานได้ทั้งมือถือและคอมพิวเตอร์

## 🚀 วิธีติดตั้ง

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/YOUR_USERNAME/family-finance-app.git
cd family-finance-app
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Firebase

1. ไปที่ [Firebase Console](https://console.firebase.google.com)
2. สร้าง Project ใหม่
3. เพิ่ม **Web App** และคัดลอก `firebaseConfig`
4. เปิดใช้ **Firestore Database** (Start in test mode)
5. เปิดใช้ **Authentication** → เลือก Anonymous

### 4. สร้างไฟล์ `.env`

```bash
cp .env.example .env
```

แล้วแก้ไขค่าในไฟล์ `.env` ด้วยค่าจาก Firebase Console ของคุณ:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_APP_ID=family-finance-app
```

### 5. รันโปรเจกต์

```bash
npm run dev
```

เปิด http://localhost:5173

## 🔥 Firestore Security Rules

ในระหว่าง Development ใช้ **test mode** ได้เลย แต่ก่อน Deploy ให้ตั้ง Rules ดังนี้:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/{collection}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🏗️ โครงสร้างโปรเจกต์

```
family-finance-app/
├── src/
│   ├── App.jsx          # หน้าหลักของแอพ
│   ├── firebase.js      # Firebase configuration
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles + Tailwind
├── .env.example         # ตัวอย่างตัวแปร environment
├── .env                 # ค่าจริง (ห้าม commit!)
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI Framework |
| Vite | 5 | Build Tool |
| Firebase | 10 | Realtime Database + Auth |
| TailwindCSS | 3 | Styling |
| lucide-react | Latest | Icons |

## 📦 Build สำหรับ Production

```bash
npm run build
```

ไฟล์จะถูก build ไปที่ `dist/` folder

## 🌐 Deploy บน Firebase Hosting (ตัวเลือก)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

Made with ❤️ for Thai families 🇹🇭
