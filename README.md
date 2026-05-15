# CampusFlow Web

Frontend aplikasi **CampusFlow**, sebuah sistem layanan akademik dan manajemen permohonan dosen pembimbing untuk lingkungan kampus. Dibangun dengan Next.js 16 App Router, React 19, TypeScript, dan Tailwind CSS v4 di atas component primitive Radix UI.

Aplikasi ini terhubung ke arsitektur microservices CampusFlow melalui API Gateway, dengan autentikasi berbasis JWT (access token + refresh token) dan role-based access control.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Arsitektur Singkat](#arsitektur-singkat)
- [Struktur Direktori](#struktur-direktori)
- [Persyaratan](#persyaratan)
- [Instalasi & Menjalankan](#instalasi--menjalankan)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Role & Halaman](#role--halaman)
- [Konvensi Kode](#konvensi-kode)
- [Build Production](#build-production)
- [Troubleshooting](#troubleshooting)

---

## Fitur Utama

- **Autentikasi & Otorisasi**
  - Login berbasis JWT dengan access token dan refresh token
  - Auto-refresh token saat access token kedaluwarsa
  - Role-based redirect setelah login (Super Admin, Admin Prodi, Mahasiswa, Dosen, Kaprodi, Tata Usaha)
  - Protected routes melalui komponen `ProtectedPage`
- **Manajemen Permohonan Akademik**
  - Pengajuan layanan akademik oleh mahasiswa (dengan upload lampiran)
  - Review dan approval flow oleh staff, kaprodi, dan admin prodi
  - Riwayat dan tracking status permohonan
- **Manajemen Permohonan Dosen Pembimbing**
  - Pengajuan permohonan pembimbing oleh mahasiswa
  - Approval flow lintas role (admin, kaprodi, dosen)
- **Notifikasi**
  - Halaman notifikasi terpusat untuk semua role
  - Toast notifications via Sonner
- **Pelaporan**
  - Halaman reports dengan visualisasi chart (Recharts)
- **Design System Internal**
  - Token sistem berbasis CSS custom properties pada `globals.css`
  - Library komponen UI bergaya shadcn (Button, Card, Dialog, Input, Select, Tabs, Table, dsb.)
  - App Shell layout dengan sidebar navigasi yang adaptif per role
  - Dukungan font Inter dan JetBrains Mono via `next/font`

---

## Tech Stack

| Kategori          | Pilihan                                                |
| ----------------- | ------------------------------------------------------ |
| Framework         | Next.js 16 (App Router) + React 19                     |
| Bahasa            | TypeScript 5                                           |
| Styling           | Tailwind CSS v4 + `tw-animate-css`                     |
| Komponen UI       | Radix UI primitives + komponen internal bergaya shadcn |
| Form & Validation | Native HTML form + state lokal React                   |
| Notifikasi        | Sonner (toast)                                         |
| Ikon              | Lucide React                                           |
| Visualisasi Data  | Recharts                                               |
| Utilities         | `clsx`, `tailwind-merge`, `class-variance-authority`   |
| Linting           | ESLint 9 + `eslint-config-next`                        |

---

## Arsitektur Singkat

Web ini adalah klien yang berkomunikasi dengan **API Gateway** (Go) pada `NEXT_PUBLIC_API_BASE_URL`. API Gateway memforward request ke microservices internal:

```
[ Web (Next.js) ]
        │ HTTPS / fetch
        ▼
[ API Gateway (Go) ]
        │ gRPC
        ├──▶ auth-service
        ├──▶ academic-service
        ├──▶ file-service
        ├──▶ notification-service
        └──▶ reporting-service
```

Modul API client (`src/lib/*-api.ts`) memisahkan tiap domain. Helper `apiFetch` di `src/lib/api.ts` menangani:

- Penyisipan header `Authorization: Bearer <token>`
- Refresh token otomatis bila response `401`
- Pembersihan session dan redirect ke `/login` saat refresh gagal

---

## Struktur Direktori

```
apps/web/
├── public/                      # Aset statis
├── src/
│   ├── app/                     # App Router (route per folder)
│   │   ├── admin/               # Dashboard & permohonan untuk SUPER_ADMIN/ADMIN_PRODI
│   │   ├── head/                # Dashboard untuk KAPRODI
│   │   ├── lecturer/            # Dashboard untuk DOSEN
│   │   ├── staff/               # Dashboard untuk TATA_USAHA
│   │   ├── student/             # Dashboard untuk MAHASISWA
│   │   ├── login/               # Halaman login
│   │   ├── notifications/       # Notifikasi terpusat
│   │   ├── reports/             # Halaman pelaporan
│   │   ├── error.tsx            # Error boundary global
│   │   ├── not-found.tsx        # 404 page
│   │   ├── globals.css          # Design tokens + base styles
│   │   ├── layout.tsx           # Root layout + font + Toaster
│   │   └── page.tsx             # Landing / redirect
│   ├── components/
│   │   ├── academic/            # Komponen domain akademik
│   │   ├── layout/              # AppShell, ProtectedPage
│   │   └── ui/                  # Library komponen presentational
│   ├── lib/                     # API clients, utilities, auth storage
│   └── types/                   # Tipe global (auth, dsb.)
├── .env.local                   # Konfigurasi lokal (tidak di-commit)
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## Persyaratan

- **Node.js** 20.x atau lebih baru
- **npm** 10.x (atau pnpm/yarn/bun setara)
- **API Gateway CampusFlow** berjalan dan dapat diakses dari mesin pengembangan

---

## Instalasi & Menjalankan

```bash
# 1. Pindah ke direktori web
cd apps/web

# 2. Install dependencies
npm install

# 3. Salin dan sesuaikan environment variables
#    (lihat bagian "Konfigurasi Environment")
cp .env.local.example .env.local   # jika file contoh tersedia

# 4. Jalankan development server
npm run dev
```

Aplikasi akan tersedia di [http://localhost:3000](http://localhost:3000).

> Pastikan API Gateway sudah berjalan di URL yang sesuai dengan `NEXT_PUBLIC_API_BASE_URL` sebelum mencoba login.

---

## Konfigurasi Environment

Buat file `.env.local` di `apps/web/` dengan variabel berikut:

| Variabel                   | Wajib | Default                 | Deskripsi                              |
| -------------------------- | ----- | ----------------------- | -------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Ya    | `http://localhost:8080` | Base URL menuju API Gateway CampusFlow |

Contoh:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Variabel berawalan `NEXT_PUBLIC_` akan terekspos ke browser. Jangan menaruh secret di sana.

---

## Role & Halaman

Mapping role ke halaman dashboard utama (didefinisikan di `src/lib/role-redirect.ts`):

| Role          | Path Default | Modul yang Diakses                             |
| ------------- | ------------ | ---------------------------------------------- |
| `SUPER_ADMIN` | `/admin`     | Manajemen sistem, semua permohonan             |
| `ADMIN_PRODI` | `/admin`     | Permohonan akademik & pembimbing tingkat prodi |
| `MAHASISWA`   | `/student`   | Pengajuan layanan akademik & pembimbing        |
| `DOSEN`       | `/lecturer`  | Daftar bimbingan & permohonan masuk            |
| `KAPRODI`     | `/head`      | Approval permohonan tingkat prodi              |
| `TATA_USAHA`  | `/staff`     | Pemrosesan permohonan administrasi             |

Setiap dashboard role dibungkus oleh `ProtectedPage` yang melakukan validasi sesi sebelum render.

---

## Konvensi Kode

- **Path alias**: gunakan `@/` untuk import dari `src/` (konfigurasi di `tsconfig.json`).
- **Komponen UI**: tempatkan komponen presentational di `src/components/ui/`. Komponen domain di `src/components/<domain>/`.
- **API client**: setiap domain memiliki module sendiri (`academic-api.ts`, `auth-api.ts`, dst.). Hindari memanggil `fetch` langsung dari komponen.
- **Styling**: gunakan token CSS dari `globals.css`. Hindari hex literal di komponen jika sudah ada token-nya.
- **Server vs Client Component**: tandai eksplisit dengan `"use client"` hanya bila perlu (interaktivitas, hooks, browser API).

Jalankan linter sebelum commit:

```bash
npm run lint
```

---

## Build Production

```bash
npm run build
npm run start
```

`next start` melayani build hasil `next build` pada port 3000 secara default. Untuk deploy, build artifact dapat dijalankan di environment Node.js standar atau dikemas dalam container.

---

## Troubleshooting

**Login berhasil tetapi langsung redirect ke `/login` lagi**
Periksa bahwa API Gateway mengembalikan struktur `LoginResponseData` yang benar (`accessToken`, `refreshToken`, `user`). Lihat `src/types/auth.ts`.

**Request selalu gagal dengan CORS error**
Pastikan API Gateway sudah memasang CORS middleware dan `NEXT_PUBLIC_API_BASE_URL` mengarah ke origin yang diizinkan.

**Hot reload tidak bekerja di Windows**
Coba jalankan dev server di luar folder yang disinkronkan oleh OneDrive/Dropbox. File watcher Next.js dapat tidak konsisten pada folder yang ter-sync.

**Token tidak tersimpan setelah login**
`apiFetch` membaca token dari `localStorage` (`campusflow_access_token`, `campusflow_refresh_token`). Pastikan browser tidak memblokir storage untuk origin yang digunakan.

---

## Lisensi

Bagian dari proyek internal CampusFlow. Hubungi pemilik repository untuk informasi lisensi dan kontribusi.
