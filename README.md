# OFDA Portal — Frontend

Antarmuka web OFDA Portal (PT Onduline Indonesia). Modul yang berjalan saat ini
adalah OCR Purchase Invoice untuk OBM: unggah batch invoice, pantau job OCR,
review hasil ekstraksi, resolusi PO, lalu submit ke Business Central.

React 19 + Vite 8, TanStack Query, React Router 7, Tailwind 4, dan i18next
(Bahasa Indonesia dan Inggris).

## Setup

```bash
npm install
cp .env.example .env     # arahkan VITE_API_URL ke backend
npm run dev              # http://localhost:5173
```

Backend harus berjalan lebih dulu dan port dev ini harus terdaftar di
`CORS_ORIGINS` milik backend.

## Perintah

| Perintah | Keterangan |
| --- | --- |
| `npm run dev` | Dev server dengan HMR |
| `npm run build` | Typecheck lalu build produksi ke `dist/` |
| `npm run preview` | Preview hasil build |
| `npm run typecheck` | Typecheck saja |
| `npm run lint` | oxlint |
| `npm run format` | Prettier |

## Struktur

```
src/
├── components/
│   ├── layout/      AppLayout, Header, Sidebar
│   └── ui/          Komponen generik (CustomSelect, UnderMaintenancePage)
├── config/          navigation.config.ts, sumber kebenaran menu sidebar
├── context/         AuthProvider
├── features/
│   ├── auth/        Login
│   ├── ocr-invoice/ Dashboard, upload, daftar, review, resolusi PO
│   └── settings/    Manajemen user
├── hooks/           useAuth
├── lib/             Setup i18n dan TanStack Query
├── locales/         Terjemahan id dan en
├── routes/          Definisi route
├── services/        Instance axios dan penyimpanan sesi
└── utils/           Helper pemeriksaan permission
```

## Autentikasi

`src/services/auth-session.ts` adalah satu-satunya tempat token sesi disimpan,
dipakai bersama oleh interceptor axios dan `AuthProvider` supaya keduanya tidak
saling bergantung.

Interceptor di `src/services/api.ts` menyisipkan access token ke setiap
request. Saat menerima 401, interceptor menukar refresh token dengan sesi baru
lalu mengulang request aslinya satu kali. Beberapa request yang gagal berbarengan
berbagi satu permintaan refresh. Bila refresh juga gagal, sesi dibersihkan dan
`ProtectedRoute` mengalihkan ke halaman login.

Setiap aplikasi dimuat, `AuthProvider` memanggil `GET /auth/me` untuk
menyegarkan role dan permission, sehingga perubahan hak akses dari sisi admin
langsung terlihat.

## Permission dan navigasi

`navigationConfig` menentukan role dan permission untuk setiap item menu, dan
`hasPermission()` di `src/utils/rbac.utils.ts` memutuskan apakah item itu
tampil. Ini **hanya** untuk menyembunyikan menu; penegakan akses yang
sebenarnya ada di backend.

## Berkas invoice

Berkas invoice dilindungi guard di backend sehingga tidak bisa dipasang
langsung sebagai URL di tag `<embed>` atau `<img>`: browser tidak akan
menyertakan header `Authorization`. `InvoiceReviewPage` mengambil berkas lewat
axios sebagai blob, membuat object URL, dan mencabutnya saat unmount.

## Modul yang belum dibangun

Business Partner Portal, Expense Management, Sales Exception Approval, dan
Rebate Management belum memiliki backend. Menu-nya tetap tampil namun mengarah
ke `UnderMaintenancePage`; pemetaannya ada di `PLANNED_MODULES` pada
`src/routes/index.tsx`.
