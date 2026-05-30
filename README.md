# Family Finance App

แอปจัดการการเงินครอบครัวแบบ local-first สำหรับบันทึกรายรับ รายจ่าย งบประมาณ เป้าหมายการออม กระเป๋าเงิน และบิลประจำ ข้อมูลทั้งหมดเก็บใน browser `localStorage` ของผู้ใช้ พร้อม export/import backup ได้

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-cyan?logo=tailwindcss)

## Features

- Dashboard สรุปรายรับ รายจ่าย ยอดเงินรวม กราฟแนวโน้ม 15 วัน และ Financial Health Score
- รายงานรายเดือนพร้อม action plan, budget risk, runway เงินสำรอง, wallet balance และ export CSV
- รายการธุรกรรมพร้อมค้นหา กรองตามเดือน/บัญชี/ประเภท แก้ไขรายการ และลบแบบยืนยัน
- โอนเงินระหว่างกระเป๋าโดยสร้างรายการคู่แบบ linked transaction
- ตั้งงบประมาณรายเดือน โยกงบระหว่างหมวด และติดตามสถานะใกล้เกินงบ
- เป้าหมายการออมพร้อม progress และสถานะสำเร็จ
- ตั้งค่าธีม สกุลเงิน กระเป๋าเงิน บิลประจำพร้อมวันครบกำหนด และ demo data
- Export/Import backup เป็น JSON และ export CSV สำหรับ Excel
- PWA service worker สำหรับ cache หน้า app พื้นฐาน

## Requirements

- Node.js 24 หรือใหม่กว่า
- npm 11 หรือใหม่กว่า

## Development

```bash
npm ci
npm run dev
```

เปิด `http://localhost:5173`

## Supabase Cloud Sync

The app now supports Supabase Auth, Postgres persistence, and Realtime sync across devices.

1. Run the migration in `supabase/migrations/20260530013000_finance_cloud_sync.sql` against the Supabase project.
2. Add these Vercel environment variables for Production, Preview, and Development:

```bash
VITE_SUPABASE_URL=https://byxxbkhjdfqsbocebkgj.supabase.co
VITE_SUPABASE_ANON_KEY=<your public anon or publishable key>
```

3. Redeploy Vercel, then sign in from Settings on each device with the same Supabase Auth account.

Security model:

- Browser code only uses public Supabase config. Never expose a service role key.
- All finance tables have RLS enabled and policies scoped to `auth.uid()`.
- Local storage remains as an offline/cache fallback, then migrates to cloud after first sign-in if cloud data is empty.

## Quality Checks

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Data Model

ข้อมูลหลักถูกเก็บใน `localStorage` ตาม key ต่อไปนี้:

- `family_finance_transactions`
- `family_finance_budgets`
- `family_finance_goals`
- `family_finance_wallets`
- `family_finance_theme`
- `family_finance_currency`
- `family_finance_recurring`

ใช้เมนู Settings เพื่อ export backup ก่อน reset หรือย้ายเครื่อง

## Security Notes

- แอปใช้ local-first storage และสามารถ sync ผ่าน Supabase เมื่อผู้ใช้ sign in
- `localStorage` ไม่เหมาะกับข้อมูลลับระดับรหัสผ่านหรือ token
- ก่อน deploy production ควรเปิดใช้ HTTPS และตรวจ `npm audit` ให้ผ่าน
- Supabase sync ต้องเปิด RLS และใช้เฉพาะ public anon/publishable key ใน browser เท่านั้น

## Project Structure

```text
family-finance-app/
  public/
    manifest.webmanifest
    sw.js
  src/
    components/
    context/
    pages/
    utils/
  eslint.config.js
  vite.config.js
```
