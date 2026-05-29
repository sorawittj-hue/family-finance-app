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

- แอปนี้ไม่มี backend และไม่ส่งข้อมูลการเงินออกจากเครื่องโดยอัตโนมัติ
- `localStorage` ไม่เหมาะกับข้อมูลลับระดับรหัสผ่านหรือ token
- ก่อน deploy production ควรเปิดใช้ HTTPS และตรวจ `npm audit` ให้ผ่าน
- ถ้าต้องการ sync ข้ามเครื่อง ควรเพิ่ม backend/auth พร้อม rules ที่จำกัดสิทธิ์ต่อครอบครัวหรือบัญชีผู้ใช้

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
