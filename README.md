# ระบบบริหารหอพักและจัดการมิเตอร์น้ำ-ไฟ (Apartment Utility Management System)

ระบบบริหารหอพัก บันทึกมิเตอร์น้ำ-ไฟ คำนวณค่าใช้จ่ายอัตโนมัติ และพิมพ์ใบแจ้งหนี้/ใบเสร็จ สำหรับเจ้าของหอพัก รองรับการใช้งานภาษาไทยเต็มรูปแบบ ออกแบบตามหลัก Responsive Design โดยเน้นการใช้งานบนหน้าจอมือถือแนวตั้ง (Vertical Mobile View สำหรับเดินจดมิเตอร์) และหน้าจอคอมพิวเตอร์แนวนอน (Horizontal Desktop View สำหรับดูภาพรวมและจัดการระบบ) พร้อมฟอนต์ขนาดใหญ่ชัดเจน (No small font)

---

## 🏗️ โครงสร้างโปรเจกต์ (Separated Folders)

```
ApartmentSystemManagement/
├── backend/                   # NestJS Backend API
│   ├── prisma/
│   │   └── schema.prisma      # Prisma ORM Schema (Supabase PostgreSQL)
│   ├── src/
│   │   ├── auth/              # JWT Auth, Register, Login, CurrentOwner Guard & Decorator
│   │   ├── apartment/         # Apartment CRUD, Price Controls, Co-owners & Nicknames
│   │   ├── room/              # Rooms Management, Differing Base Prices, Batch Rooms
│   │   ├── meter/             # Meter Readings (Units, Prices, Monthly Reports, Bills)
│   │   ├── cache/             # Redis Server Caching (ioredis with in-memory fallback)
│   │   └── prisma/            # Global Prisma Client Service
│   ├── .env.example           # ตัวอย่างการตั้งค่า Environment Variables
│   └── package.json
│
└── frontend/                  # React + Vite + Tailwind CSS Front-end
    ├── src/
    │   ├── components/        # Navbar, BottomNav, Input, Modal, Printable BillModal
    │   ├── contexts/          # AuthContext, ApartmentContext
    │   ├── pages/             # Dashboard, MeterReading, RoomList, ApartmentList, Auth
    │   ├── services/          # Axios API Client with JWT Interceptors
    │   ├── utils/             # Front-end Syntax & Zod Form Validation
    │   └── types/             # TypeScript Types & Interfaces
    ├── package.json
    └── vite.config.ts
```

---

## ✨ ฟีเจอร์หลัก (Key Features)

1. **การควบคุมราคาค่าน้ำและค่าไฟฟ้า**:
   - เจ้าของหอพักสามารถกำหนดราคาค่าไฟฟ้าต่อหน่วย (บาท/หน่วย) ได้อย่างอิสระ
   - กำหนดรูปแบบค่าน้ำประปาได้ทั้งแบบ **คิดตามหน่วยจริง (บาท/หน่วย)** หรือแบบ **เหมาจ่ายรายเดือน (บาท/เดือน)**
   - แต่ละห้องสามารถกำหนดราคาค่าไฟ/ค่าน้ำเฉพาะห้องเพื่อ Override ราคาโครงการได้
2. **ราคาค่าเช่าห้องพักแต่ละห้องแตกต่างกันได้ (Differing Base Price)**:
   - แต่ละห้องสามารถตั้งราคาค่าเช่าฐาน (Base Rent Price) แตกต่างกันได้ เช่น ชั้นล่าง/ชั้นบน หรือห้องมุม
   - มีระบบสร้างห้องพักแบบชุด (Batch Generator) เพื่อความสะดวกรวดเร็ว
3. **ระบบหลายหอพักและชื่อเล่น (Nicknames)**:
   - เจ้าของ 1 คนสามารถมีหลายหอพักได้
   - แต่ละหอพักสามารถตั้ง **ชื่อเล่น / ชื่อย่อ** ได้ เช่น "ตึก A", "หอหลัง ม." เพื่อง่ายต่อการจำและสลับหอพัก
4. **รองรับเจ้าของร่วม (Multiple Owners per Apartment & Multi-tenancy)**:
   - แต่ละหอพักสามารถมีเจ้าของร่วมได้หลายคน (Co-owners)
   - เจ้าของแต่ละคนจะมองเห็นเฉพาะหอพักที่ตนเองมีสิทธิ์ดูแลเท่านั้น
5. **ระบบความปลอดภัยและการตรวจสอบข้อมูล (Syntax Validation & DTO)**:
   - **Front-end**: ตรวจสอบความถูกต้องของ Syntax และเงื่อนไขทุกช่องกรอกข้อมูล (Zod + Validation Helpers) ก่อนส่งไปยัง Server
   - **Back-end**: มี DTO (`class-validator` และ `class-transformer`) พร้อม `ValidationPipe` ตรวจสอบความถูกต้องอย่างเข้มงวดก่อนประมวลผล
6. **Server Caching (Redis & In-memory Fallback)**:
   - ติดตั้งระบบ Server Caching ด้วย Redis เพื่อเร่งความเร็วในการโหลดข้อมูลหอพักและห้องพัก
   - หากยังไม่ได้รัน Redis Server ระบบจะสลับไปใช้ High-speed In-memory Cache อัตโนมัติโดยไม่ทำให้ระบบขัดข้อง
7. **ออกแบบเพื่อการใช้งานจริง (Mobile & Desktop View / No Small Font)**:
   - **หน้าจอมือถือแนวตั้ง**: มี Bottom Navigation Bar ขนาดใหญ่ ปุ่มกดถนัดมือ และโหมดจดมิเตอร์แบบเดินจดตามห้อง (Door-to-door Fast Entry) พร้อมคำนวณหน่วยและยอดเงินทันที
   - **หน้าจอคอมพิวเตอร์แนวนอน**: แสดงตารางข้อมูลสรุปครบถ้วน กราฟตัวเลขรายได้รวมประจำเดือน และการจัดการระบบ
   - **ไม่มีฟอนต์ขนาดเล็ก**: ตัวหนังสือขนาดใหญ่อ่านง่าย (Base 17-18px) คอนทราสต์ชัดเจน มองเห็นสะดวกแม้อยู่กลางแจ้ง
8. **ใบเสร็จ / บิลเรียกเก็บเงินพร้อมพิมพ์ (Printable Bills)**:
   - แสดงรายละเอียดค่าเช่าห้อง เลขมิเตอร์ไฟครั้งก่อน-ปัจจุบัน หน่วยที่ใช้ ยอดเงิน ค่าน้ำ ค่าส่วนกลาง ยอดรวมสุทธิ และสถานะการชำระเงิน

---

## 🚀 วิธีการติดตั้งและเริ่มใช้งาน (Quick Start)

### 1. การตั้งค่า Backend (NestJS + Prisma + Supabase)

1. เข้าไปที่โฟลเดอร์ `backend`:
   ```bash
   cd backend
   ```
2. สร้างไฟล์ `.env` โดยคัดลอกมาจาก `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. ใส่ Connection String ของฐานข้อมูล **Supabase PostgreSQL** ของคุณใน `.env`:
   ```env
   # ตัวอย่างจาก Supabase Dashboard -> Project Settings -> Database
   DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

   JWT_SECRET="your_secure_jwt_secret_key"
   PORT=4000
   ```
4. ซิงค์ตารางฐานข้อมูลไปยัง Supabase ด้วย Prisma:
   ```bash
   npx prisma db push
   ```
5. รัน Backend API ในโหมด Development:
   ```bash
   npm run start:dev
   ```
   > Backend API จะทำงานที่: `http://localhost:4000/api`

---

### 2. การตั้งค่า Frontend (React + Vite)

1. เปิด Terminal ใหม่แล้วเข้าไปที่โฟลเดอร์ `frontend`:
   ```bash
   cd frontend
   ```
2. รัน Frontend Development Server:
   ```bash
   npm run dev
   ```
   > เข้าใช้งานระบบผ่านเบราว์เซอร์ที่: `http://localhost:3000`

---

## 📱 หน้าจอและการใช้งานหลัก

1. **เข้าสู่ระบบ / ลงทะเบียน (Owner Auth)**: เข้าใช้งานด้วยอีเมลและรหัสผ่าน
2. **หน้าภาพรวม (Dashboard)**: แสดงตัวเลขสรุปประจำเดือน, สถิติหน่วยไฟฟ้ารวม, สถิติหน่วยน้ำรวม, ยอดรวมเงิน, จำนวนห้องที่ชำระแล้ว/ยังไม่ชำระ
3. **หน้าจดมิเตอร์ (Meter Reading)**: เลือกรอบบิล (เช่น `2026-10`), กรอกเลขมิเตอร์ไฟและน้ำ ระบบคำนวณหน่วยที่ใช้และยอดเงินให้แบบ Real-time พร้อมปุ่มบันทึกแยกรายห้องหรือบันทึกทั้งหมด
4. **หน้าจัดการห้องพัก (Rooms)**: สร้างห้องพักทีละห้องหรือสร้างเป็นชุด (Batch), กำหนดราคาค่าเช่าฐานของแต่ละห้อง, กรอกข้อมูลผู้เช่า
5. **หน้าตั้งค่าหอพัก (Apartments & Rates)**: กำหนดราคาค่าไฟ (บ./หน่วย), ค่าน้ำ (บ./หน่วย หรือ เหมาจ่าย), ค่าส่วนกลาง, ชื่อเล่นหอพัก และจัดการเพิ่มเจ้าของร่วม (Co-owners)
