-- Supabase SQL: Create users table
-- ให้รัน SQL นี้ใน Supabase SQL Editor

-- 1. สร้าง users table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  memberId TEXT NOT NULL,
  memberName TEXT,
  displayName TEXT NOT NULL,
  role TEXT DEFAULT 'fan',
  unit TEXT DEFAULT '',
  gen TEXT DEFAULT '',
  avatar TEXT,
  cover TEXT,
  memberIdUpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. สร้าง index สำหรับ uid (for quick lookup)
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

-- 3. สร้าง index สำหรับ email (for login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 4. สร้าง index สำหรับ memberId
CREATE INDEX IF NOT EXISTS idx_users_memberId ON users(memberId);

-- 5. Enable RLS (Row Level Security) - optional แต่ recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. สร้าง policy ให้ user เห็นแค่ข้อมูลตัวเองได้
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = uid::uuid);

-- 7. สร้าง policy ให้ user update แค่ข้อมูลตัวเองได้
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = uid::uuid);

-- ตัวอย่าง insert (ทดสอบ)
-- INSERT INTO users (uid, email, memberId, memberName, displayName, role)
-- VALUES ('user-123', 'user@example.com', 'NTL48-user123', 'Test User', 'Test User', 'fan');
