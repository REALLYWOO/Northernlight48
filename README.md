# NTL48

แอปนี้ถูกแปลงจากไฟล์ HTML เดี่ยว (ที่ใช้ Tailwind CDN + Babel Standalone + esm.sh)
มาเป็นโปรเจกต์ **Vite + React** แบบมาตรฐาน พร้อม build จริงสำหรับ production

## โครงสร้างโปรเจกต์

```
ntl48/
├── index.html          # entry HTML (ไม่มี CDN script แล้ว)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx         # จุดเริ่ม mount React
    ├── App.jsx          # โค้ดแอปทั้งหมด (component, logic เดิมทั้งหมด)
    └── index.css        # Tailwind directives + global styles + font import
```

## วิธีติดตั้งและรัน (dev)

```bash
npm install
npm run dev
```

จะได้ dev server ที่ http://localhost:5173 พร้อม hot-reload

## Build สำหรับ production

```bash
npm run build
```

ได้โฟลเดอร์ `dist/` ที่มีไฟล์ static (HTML/CSS/JS ที่ minify และ purge Tailwind แล้ว)
เอาโฟลเดอร์นี้ไป deploy บน hosting ใดก็ได้ (Netlify, Vercel, Cloudflare Pages, Nginx ฯลฯ)

ดูตัวอย่างผลลัพธ์ก่อน deploy จริงได้ด้วย:

```bash
npm run preview
```

## สิ่งที่เปลี่ยนไปจากไฟล์เดิม

- ลบ `<script src="https://cdn.tailwindcss.com">` → ใช้ Tailwind ผ่าน PostCSS แทน (config อยู่ใน `tailwind.config.js` / `postcss.config.js`)
- ลบ Babel Standalone (`@babel/standalone`) → Vite + `@vitejs/plugin-react` เป็นตัว compile JSX แทน (compile ตอน build ไม่ใช่ใน browser)
- ลบ import map ที่ชี้ไป esm.sh → ติดตั้ง `react`, `react-dom`, `lucide-react` ผ่าน npm ปกติ (อยู่ใน `package.json`)
- โค้ด logic/component ทั้งหมดยังเหมือนเดิมทุกบรรทัด (ไม่ได้แก้ behavior ใดๆ) แค่ย้ายมาอยู่ใน `src/App.jsx`
- ฟอนต์ Prompt และสไตล์ global (scrollbar ซ่อน, tap-highlight) ย้ายไปอยู่ใน `src/index.css`

## หมายเหตุ

โค้ดทั้งหมดใน `src/App.jsx` ยังเป็นไฟล์เดียวขนาดใหญ่ (~1270 บรรทัด รวมทุก component)
เพื่อลดความเสี่ยงตอนแปลง ถ้าต้องการแยกเป็นไฟล์ component ย่อยๆ (เช่น `src/components/PostCard.jsx`,
`src/components/AuthScreen.jsx` ฯลฯ) เพื่อให้ maintain ง่ายขึ้นในระยะยาว แจ้งได้ ทำเพิ่มให้ได้เช่นกัน
