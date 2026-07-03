# Firebase → Supabase Migration Summary ✅

## ไฟล์ที่แก้ไขแล้ว

### 1. **useSupabase.js** ✨
**เปลี่ยนแปลง:**
- ✅ เพิ่ม `fetchFullUserData()` เพื่อดึงข้อมูล user จาก users table
- ✅ `onAuthStateChange` ดึง full user data (มี displayName, memberId, unit, avatar, cover)
- ✅ `login()` ดึง full user data หลังจาก sign in
- ✅ `register()` return full user data พร้อม displayName และ memberId

**ข้อมูล currentUser ตอนนี้มี:**
```
{
  id: "...",                    // Supabase auth ID
  uid: "...",                   // จาก users table
  email: "...",
  displayName: "...",           // จาก users table
  memberId: "...",              // จาก users table
  unit: "",
  avatar: null,
  cover: null,
  role: "fan",
  createdAt: "...",
  memberIdUpdatedAt: "...",
}
```

---

### 2. **App.jsx** 🔧
**เปลี่ยนแปลง:**

#### บรรทัด 1219
```javascript
// Before:
const { currentUser, loading, register: supabaseRegister, login: supabaseLogin, logout } = useSupabaseAuth();

// After: ✅ เหมือนเดิม (OK)
```

#### บรรทัด 1230-1244
```javascript
// Before: Firebase comment
const { currentUser, loading, register: supabaseRegister, login: supabaseLogin, logout } = useSupabaseAuth();

// After: Supabase comment + เอา uid → id
useEffect(() => {
  if (currentUser) {
    setCurrentUserState({
      id: currentUser.id,                               // ✅ เปลี่ยน uid → id
      email: currentUser.email,
      name: currentUser.displayName || currentUser.email, // ✅ ใช้ displayName จาก users table
      memberId: currentUser.memberId || "NTL48-...",    // ✅ ใช้ memberId จาก users table
      displayName: currentUser.displayName,             // ✅ เพิ่ม
      unit: currentUser.unit,                           // ✅ เพิ่ม
      avatar: currentUser.avatar,                       // ✅ เพิ่ม
      cover: currentUser.cover,                         // ✅ เพิ่ม
    });
  }
}, [currentUser]);
```

#### บรรทัด 1281-1283
```javascript
// เพิ่ม supabaseRegister และ supabaseLogin เข้า context
const ctxValue = {
  users, setUsers, currentUser, setCurrentUser, logout, updateCurrentUser,
  posts, setPosts, addPost,
  stories, addStory,
  likes, setLikes, toggleLike,
  saved, toggleSave,
  openComments, toggleComments,
  drafts, setDraft, submitComment,
  members,
  supabaseRegister, supabaseLogin,  // ✅ เพิ่ม
};
```

#### บรรทัด 125-148 (LoginForm)
```javascript
// Before:
function LoginForm({ onSwitch, onForgot }) {
  const { login: firebaseLogin } = useAuth();  // ❌ ใช้ Firebase
  const submit = async () => {
    await firebaseLogin(email, password);
  };
}

// After:
function LoginForm({ onSwitch, onForgot }) {
  const { supabaseLogin } = useCtx();          // ✅ ใช้ context
  const submit = async () => {
    await supabaseLogin(email, password);
  };
}
```

#### บรรทัด 169-197 (RegisterForm)
```javascript
// Before:
function RegisterForm({ onSwitch }) {
  const { register: firebaseRegister } = useAuth();  // ❌ ใช้ Firebase
  const submit = async () => {
    await firebaseRegister(email, password, memberId, memberName);
  };
}

// After:
function RegisterForm({ onSwitch }) {
  const { supabaseRegister } = useCtx();            // ✅ ใช้ context
  const submit = async () => {
    await supabaseRegister(email, password, memberId, memberName);
  };
}
```

---

## ไฟล์ที่ไม่ต้องใช้แล้ว

### ❌ **useAuth.js** 
- ไม่ต้องใช้แล้ว
- ใช้ `useSupabase.js` แทน

---

## Checklist ตรวจสอบ ✓

- [x] useSupabase.js - ดึง full user data จาก users table
- [x] App.jsx - ใช้ useSupabaseAuth จาก currentUser
- [x] LoginForm - ใช้ supabaseLogin จาก context
- [x] RegisterForm - ใช้ supabaseRegister จาก context
- [x] Context - มี supabaseRegister และ supabaseLogin
- [x] ลบ import useAuth ออกจาก App.jsx

---

## การทดสอบ (Testing)

### 1. Register User ใหม่
```
- Input: email, password, memberId, memberName
- Expected: 
  - User สร้างใน Supabase Auth
  - User data เก็บใน users table
  - currentUser มี displayName + memberId
```

### 2. Login
```
- Input: email, password
- Expected:
  - currentUser มี displayName + memberId จาก users table
  - App แสดง MainApp หรือ AuthScreen ถูกต้อง
```

### 3. Logout
```
- Input: Click logout
- Expected:
  - currentUser = null
  - App แสดง AuthScreen
```

---

## หากมีปัญหา 🔍

### Error: "displayName is undefined"
→ ตรวจสอบว่า users table มี displayName หรือไม่

### Error: "Cannot find variable useAuth"
→ ได้ลบ import useAuth แล้ว แต่อาจต้องลบ useAuth.js ออกจากโปรเจค

### Error: "users table ไม่มี column X"
→ ตรวจสอบว่า Supabase users table มี columns ตรงตามที่ insertใน register

---

## Next Steps 🚀

1. อัพเดท App.jsx และ useSupabase.js
2. ลบไฟล์ useAuth.js และ firebase.js ออก
3. ทดสอบ Register → Login → Logout
4. ตรวจสอบ users table ใน Supabase
5. ✅ Done! Firebase → Supabase Migration Complete!
