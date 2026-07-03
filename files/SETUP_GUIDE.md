# Firebase → Supabase Migration - Setup Guide 🚀

## ขั้นตอนการติดตั้ง

### Step 1: อัพเดท Supabase Configuration ✅
ตรวจสอบว่า `useSupabase.js` มี URL และ KEY ถูกต้อง:

```javascript
const SUPABASE_URL = "https://cknldqbyybbcmmqqtohm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**ข้อมูล:**
- SUPABASE_URL → อยู่ใน Supabase Project Settings
- SUPABASE_ANON_KEY → อยู่ใน Supabase Project Settings > API

---

### Step 2: สร้าง Users Table ใน Supabase 🗄️

1. ไปที่ **Supabase Dashboard**
2. เลือก Project
3. ไปที่ **SQL Editor**
4. Copy and Paste code จาก `create_users_table.sql`
5. Click **Run** ✓

**ตรวจสอบ:**
- [ ] users table สร้างสำเร็จ
- [ ] มี columns: uid, email, memberId, displayName, etc.
- [ ] มี index สำหรับ uid, email, memberId

---

### Step 3: อัพเดท App Files 📁

แทนที่ไฟล์เก่าด้วยไฟล์ใหม่:

```bash
# ลบไฟล์เก่า
rm src/useAuth.js
rm src/firebase.js          # ถ้ามี

# เพิ่มไฟล์ใหม่
cp useSupabase.js src/useSupabase.js
cp App.jsx src/App.jsx
```

---

### Step 4: ติดตั้ง Supabase Package 📦

ตรวจสอบว่าติดตั้ง Supabase package แล้ว:

```bash
npm install @supabase/supabase-js
```

---

### Step 5: ทดสอบ Register ✓

1. เปิด App
2. Click **Register**
3. Input:
   - Email: `test@example.com`
   - Password: `test123`
   - Member ID: `NTL48-TEST`
   - Member Name: `Test User`
4. Click **Register** 🎉

**ตรวจสอบ:**
- [ ] ไม่มี error
- [ ] user สร้างใน Supabase Auth
- [ ] user data เก็บใน users table
- [ ] ตรวจสอบ Supabase Dashboard → Auth → Users (ดูว่ามี user ใหม่)

---

### Step 6: ทดสอบ Login ✓

1. Click **Login**
2. Input email และ password เดิม
3. Click **Login** 🎉

**ตรวจสอบ:**
- [ ] ไม่มี error
- [ ] currentUser มี displayName
- [ ] currentUser มี memberId
- [ ] App แสดง MainApp (Home page)

---

### Step 7: ทดสอบ Logout ✓

1. ไปที่ Profile
2. Click **Logout**
3. ควรกลับไป Auth Screen

**ตรวจสอบ:**
- [ ] ไม่มี error
- [ ] currentUser = null
- [ ] App แสดง Auth Screen

---

## Debug Guide 🔍

### Error: "Cannot read property 'displayName' of undefined"

**สาเหตุ:** users table ไม่มี displayName

**แก้ไข:**
1. ไปที่ Supabase Dashboard
2. ไปที่ **SQL Editor**
3. เรียก:
```sql
SELECT * FROM users WHERE email = 'your-email@example.com';
```
4. ตรวจสอบว่า displayName มี value หรือไม่

---

### Error: "23505: duplicate key value violates unique constraint"

**สาเหตุ:** user มีใน users table อยู่แล้ว (memberId ซ้ำ)

**แก้ไข:**
1. ลอง register ด้วย memberId ใหม่
2. หรือ ลบ user เก่า ออกจาก users table

---

### Error: "Could not find Supabase credentials"

**สาเหตุ:** SUPABASE_URL หรือ SUPABASE_ANON_KEY ไม่ถูกต้อง

**แก้ไข:**
1. ไปที่ Supabase Project Settings
2. Copy URL และ ANON KEY ใหม่
3. อัพเดท useSupabase.js

---

### Login ไม่ได้ แต่ Register ได้

**สาเหตุ:** user data ไม่เก็บใน users table ถูกต้อง

**แก้ไข:**
1. ตรวจสอบ users table schema (columns ถูกต้องหรือไม่)
2. Check register code ใน useSupabase.js
3. ดู Supabase Logs → Auth (มี error ไหม)

---

## Important Notes ⚠️

### RLS (Row Level Security)
- ถ้าเปิด RLS ต้องสร้าง policy ให้ user access ได้
- ตอนนี้เพิ่มไว้ใน SQL script แล้ว

### Email Confirmation
- Supabase อาจ require email confirmation
- ไปที่ Supabase Project Settings > Authentication > Email Templates
- ถ้าไม่ต้องให้ Disable "Confirm email"

### Password Reset
- ยังไม่มี implementation สำหรับ "Forgot Password"
- สามารถเพิ่มได้ในภายหลัง (ใช้ `supabase.auth.resetPasswordForEmail()`)

---

## Supabase Console Guide 🎛️

### ดูข้อมูล User
1. ไปที่ **Authentication** tab
2. ไปที่ **Users** section
3. ดูรายการ users ทั้งหมด

### ดูข้อมูล Users Table
1. ไปที่ **SQL Editor** หรือ **Table Editor**
2. ไปที่ **users** table
3. ดูข้อมูล memberId, displayName, etc.

### Check Database Size
1. ไปที่ **Project Settings**
2. ดู **Database** section
3. ดู storage usage

---

## Performance Optimization 📊

### ปัจจุบัน
- fetchFullUserData() ดึง users data ทุกครั้ง auth change
- อาจช้า ถ้า users table มี index ไม่ดี

### ปรับปรุง
1. ตรวจสอบ index บน uid, email
2. ใช้ Supabase `realtime` subscriptions (optional)
3. Cache users data ใน localStorage (optional)

---

## Next Steps 🎯

- [x] สร้าง users table
- [x] อัพเดท useSupabase.js
- [x] อัพเดท App.jsx
- [ ] ทดสอบ Register → Login → Logout
- [ ] ลบไฟล์ Firebase เก่า
- [ ] Deploy ไปยัง production
- [ ] Monitor Supabase Logs

---

## Contact & Support 💬

หากมีปัญหา:
1. Check `MIGRATION_SUMMARY.md`
2. Check Supabase Documentation: https://supabase.com/docs
3. Check Console Logs (F12 > Console)
4. Check Supabase Logs → Auth

---

**Happy Migrating! 🚀**
