<div align="center">

<img src="https://img.shields.io/badge/CampusFlow-Academic%20Service%20Platform-2563EB?style=for-the-badge&labelColor=0F172A" alt="CampusFlow"/>

# CampusFlow

**Sistem Layanan Akademik & Manajemen Permohonan Dosen Pembimbing**
Microservices · Event-Driven · Production-Grade Architecture

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-FF6600?logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![gRPC](https://img.shields.io/badge/gRPC-Protocol%20Buffers-4285F4?logo=google&logoColor=white)](https://grpc.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[![Status](https://img.shields.io/badge/status-active%20development-blue)](#)
[![Last Commit](https://img.shields.io/github/last-commit/nndda-rzn/campus-flow/main)](https://github.com/nndda-rzn/campus-flow/commits/main)
[![License](https://img.shields.io/badge/license-Internal-lightgrey)](#lisensi)

</div>

---

## Tentang Proyek

**CampusFlow** adalah platform digital untuk mengelola layanan akademik dan permohonan dosen pembimbing di lingkungan kampus. Sistem ini dibangun dengan **arsitektur microservices** berbasis Go, mengadopsi pola **event-driven** melalui RabbitMQ dan **transactional outbox pattern** untuk menjamin konsistensi data antar service.

Frontend dibangun di atas **Next.js 16 + React 19** dengan App Router, design system internal bergaya shadcn, dan role-based access control yang adaptif untuk enam peran pengguna.

### Mengapa CampusFlow?

- **Pemisahan domain yang tegas** — setiap kapabilitas bisnis (autentikasi, akademik, file, notifikasi, pelaporan) hidup sebagai service independen dengan database terpisah.
- **Komunikasi antar service yang aman dan cepat** — gRPC untuk request/response synchronous, RabbitMQ untuk event asynchronous.
- **Reliable messaging** — implementasi outbox pattern di academic service mencegah pesan event hilang saat publish ke broker gagal.
- **Type-safe end-to-end** — kontrak API didefinisikan di Protocol Buffers dan dikonsumsi konsisten di semua bahasa.
- **Frontend modern** — Next.js App Router dengan server/client component, optimasi font otomatis, design tokens, dan komponen Radix UI yang accessible.

---

## Daftar Isi

- [Arsitektur Sistem](#arsitektur-sistem)
- [Microservices](#microservices)
- [Tech Stack](#tech-stack)
- [Struktur Repository](#struktur-repository)
- [Fitur Utama](#fitur-utama)
- [Role & Hak Akses](#role--hak-akses)
- [Persyaratan](#persyaratan)
- [Quick Start](#quick-start)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Database & Migrasi](#database--migrasi)
- [Generate Protobuf](#generate-protobuf)
- [Menjalankan Services](#menjalankan-services)
- [API Reference Singkat](#api-reference-singkat)
- [Pengujian](#pengujian)
- [Konvensi & Best Practice](#konvensi--best-practice)
- [Roadmap](#roadmap)
- [Lisensi](#lisensi)

---

## Arsitektur Sistem

```mermaid
flowchart TB
    subgraph Client["Client Tier"]
        WEB["Next.js 16 Web App<br/>(React 19, TypeScript)"]
    end

    subgraph Gateway["Edge Tier"]
        GW["API Gateway<br/>HTTP/JSON · :8080<br/>JWT Auth · CORS · RBAC"]
    end

    subgraph Services["Microservices Tier (gRPC)"]
        AUTH["auth-service<br/>:50051"]
        ACAD["academic-service<br/>:50052"]
        FILE["file-service<br/>:50053"]
        NOTIF["notification-service<br/>:50054"]
        REPORT["reporting-service<br/>:50055"]
    end

    subgraph Messaging["Async Messaging"]
        MQ[("RabbitMQ<br/>Topic Exchange<br/>campusflow.events")]
    end

    subgraph Storage["Data Tier (PostgreSQL 16)"]
        DB1[("auth_db")]
        DB2[("academic_db")]
        DB3[("file_db")]
        DB4[("notification_db")]
        DB5[("reporting_db")]
    end

    WEB -- "HTTPS / fetch" --> GW
    GW -- gRPC --> AUTH
    GW -- gRPC --> ACAD
    GW -- gRPC --> FILE
    GW -- gRPC --> NOTIF
    GW -- gRPC --> REPORT

    ACAD -- "publish (outbox)" --> MQ
    MQ -- "consume" --> NOTIF
    MQ -- "consume" --> REPORT

    AUTH --- DB1
    ACAD --- DB2
    FILE --- DB3
    NOTIF --- DB4
    REPORT --- DB5
```

### Komunikasi & Pola

- **Synchronous (gRPC)** — Web → API Gateway (HTTP/JSON) → Microservices (gRPC). API Gateway berperan sebagai _backend-for-frontend_ yang melakukan agregasi, terjemahan protokol, dan enforcement otorisasi.
- **Asynchronous (RabbitMQ)** — Academic service mempublikasikan domain event (`academic_request.*`, `supervisor_request.*`) ke topic exchange. Notification service dan reporting service consume event tersebut secara independen.
- **Transactional Outbox** — Academic service menulis event ke tabel `outbox` dalam transaksi yang sama dengan perubahan business state. Worker `outbox_publisher` membaca dan mempublish event setiap 3 detik, menjamin **at-least-once delivery** tanpa kehilangan data jika broker sedang down.
- **Database per Service** — Setiap microservice memiliki database PostgreSQL independen untuk menjamin loose coupling dan kemudahan scaling.

---

## Microservices

| Service                  | Port  | Protokol  | Database          | Tanggung Jawab                                                      |
| ------------------------ | ----- | --------- | ----------------- | ------------------------------------------------------------------- |
| **api-gateway**          | 8080  | HTTP/JSON | —                 | Routing, JWT validation, RBAC, CORS, agregasi panggilan ke services |
| **auth-service**         | 50051 | gRPC      | `auth_db`         | Register, login, refresh token, validasi token, logout              |
| **academic-service**     | 50052 | gRPC      | `academic_db`     | Permohonan akademik, permohonan supervisor, outbox event publishing |
| **file-service**         | 50053 | gRPC      | `file_db`         | Upload, download, dan metadata dokumen (lampiran & dokumen final)   |
| **notification-service** | 50054 | gRPC      | `notification_db` | Notifikasi user, consumer event RabbitMQ, mark-as-read              |
| **reporting-service**    | 50055 | gRPC      | `reporting_db`    | Dashboard akademik & supervisor, agregasi event untuk pelaporan     |

---

## Tech Stack

### Backend

| Layer                | Pilihan                                     |
| -------------------- | ------------------------------------------- |
| Bahasa               | Go 1.25                                     |
| RPC                  | gRPC + Protocol Buffers                     |
| Web Framework        | `net/http` standard library (API Gateway)   |
| Database Driver      | `pgx/v5` (jackc) dengan connection pooling  |
| Auth                 | JWT (HS256) dengan access & refresh token   |
| Messaging            | RabbitMQ via `amqp091-go`                   |
| Workspace Management | Go Workspaces (`go.work`)                   |
| Build / Run          | `go run`, Docker Compose untuk dependencies |

### Frontend

| Layer       | Pilihan                                               |
| ----------- | ----------------------------------------------------- |
| Framework   | Next.js 16 (App Router) + React 19                    |
| Bahasa      | TypeScript 5                                          |
| Styling     | Tailwind CSS v4 + design tokens (CSS custom props)    |
| Komponen UI | Radix UI primitives + library internal bergaya shadcn |
| Visualisasi | Recharts                                              |
| Notifikasi  | Sonner (toast)                                        |
| Ikon        | Lucide React                                          |
| Utilities   | `clsx`, `tailwind-merge`, `class-variance-authority`  |

### Infrastruktur

| Komponen         | Pilihan                                   |
| ---------------- | ----------------------------------------- |
| Database         | PostgreSQL 16 (Alpine)                    |
| Message Broker   | RabbitMQ 3 (management plugin enabled)    |
| Containerization | Docker Compose (untuk dependencies infra) |
| File Storage     | Local filesystem (`storage/uploads/`)     |

---

## Struktur Repository

```
campusflow/
├── apps/
│   ├── services/                       # Backend microservices
│   │   ├── api-gateway/                # HTTP edge + JWT + RBAC + CORS
│   │   ├── auth-service/               # Authentication & token management
│   │   ├── academic-service/           # Academic & supervisor requests + outbox
│   │   ├── file-service/               # File metadata & storage
│   │   ├── notification-service/       # Notifications + event consumer
│   │   └── reporting-service/          # Dashboards + event consumer
│   └── web/                            # Next.js frontend
├── proto/                              # Protocol Buffers definitions
│   ├── auth/v1/
│   ├── academic/v1/
│   ├── file/v1/
│   ├── notification/v1/
│   ├── reporting/v1/
│   ├── common/v1/
│   └── gen/                            # Generated Go code (committed)
├── db/                                 # SQL migrations per service
│   ├── auth/migrations/
│   ├── academic/migrations/
│   ├── file/migrations/
│   ├── notification/migrations/
│   └── reporting/migrations/
├── infra/
│   └── postgres/init/                  # Multi-database init script
├── packages/
│   ├── proto/                          # (cadangan untuk paket proto)
│   └── shared/                         # (cadangan untuk shared utilities)
├── scripts/
│   └── gen-proto.ps1                   # Proto codegen script (Windows)
├── storage/uploads/                    # Local file storage
├── docs/                               # Engineering docs & requirements
├── docker-compose.yml                  # Postgres + RabbitMQ
├── go.work                             # Go workspace (multi-module)
└── README.md
```

Setiap microservice mengikuti struktur yang konsisten:

```
<service>/
├── cmd/server/main.go                  # Entry point
├── internal/
│   ├── config/                         # Konfigurasi (env loading)
│   ├── handler/                        # gRPC handler / HTTP handler
│   ├── service/                        # Business logic
│   ├── repository/                     # Database access (pgx)
│   ├── model/                          # Domain models
│   ├── messaging/                      # RabbitMQ publisher/consumer (jika ada)
│   └── worker/                         # Background workers (jika ada)
├── go.mod
└── go.sum
```

---

## Fitur Utama

### Autentikasi & Otorisasi

- Register, login, logout dengan JWT
- Access token + refresh token dengan rotation
- Auto-refresh di klien saat token kedaluwarsa
- Role-based access control di API Gateway (`RequireAuth` + `RequireRole`)
- Validasi token terdistribusi via `auth-service.ValidateToken`

### Layanan Akademik

- Pengajuan permohonan layanan akademik oleh mahasiswa dengan upload dokumen pendukung
- Verifikasi oleh Admin Prodi → Approval/Reject oleh Kaprodi → Penyelesaian oleh Tata Usaha
- Upload dokumen final oleh Tata Usaha
- History dan tracking status permohonan

### Permohonan Dosen Pembimbing

- Mahasiswa mengajukan permohonan ke dosen tertentu
- Verifikasi oleh Admin Prodi → Penugasan oleh Kaprodi → Konfirmasi oleh Dosen
- Lecturer dashboard untuk accept/reject permohonan masuk

### Portal Dosen Pembimbing

- **Dashboard** dengan KPI agregat (penetapan baru, mahasiswa bimbingan, booking pending, kuota)
- **Profil dosen** self-service (lihat/edit nama, email, NIDN, kuota)
- **Logbook bimbingan** — review, approve, minta revisi, tambah catatan, tag milestone, lampiran
- **Mahasiswa bimbingan** — progress tracking per mahasiswa dengan milestone timeline
- **Jadwal konsultasi** — CRUD slot bimbingan (buat, edit, batalkan)
- **Booking masuk** — approve/reject/reschedule booking mahasiswa
- **Review dokumen skripsi** — review dan sign-off final thesis documents (SUBMITTED → UNDER_REVIEW → APPROVED/REVISION_REQUESTED/REJECTED)
- **Pengumuman** — baca pengumuman dari administrasi
- **Kuota pembimbing** — visibility kuota per tahun akademik

### Notifikasi

- Notifikasi otomatis dipicu oleh domain event (lewat RabbitMQ)
- Halaman notifikasi terpusat dengan unread count di sidebar
- Mark-as-read per notifikasi

### Pelaporan

- Dashboard agregat untuk academic requests dan supervisor requests
- Visualisasi dengan Recharts (komposisi status, tren, distribusi)
- Akses untuk Super Admin, Admin Prodi, Kaprodi, dan Tata Usaha

### Manajemen File

- Upload dokumen pendukung (mahasiswa) dan dokumen final (tata usaha)
- Download dengan otorisasi
- Listing file per academic request

---

## Role & Hak Akses

| Role          | Path Frontend | Akses Utama                                                              |
| ------------- | ------------- | ------------------------------------------------------------------------ |
| `SUPER_ADMIN` | `/admin`      | Akses ke semua modul, termasuk verifikasi dan approval lintas tahap      |
| `ADMIN_PRODI` | `/admin`      | Verifikasi awal permohonan akademik & permohonan pembimbing              |
| `KAPRODI`     | `/head`       | Approve/reject permohonan akademik, assign dosen pembimbing              |
| `DOSEN`       | `/lecturer`   | Dashboard, profil, accept/reject penetapan, review logbook, mahasiswa bimbingan, jadwal konsultasi, booking, review skripsi, pengumuman |
| `MAHASISWA`   | `/student`    | Mengajukan permohonan akademik dan permohonan pembimbing, upload dokumen |
| `TATA_USAHA`  | `/staff`      | Menyelesaikan permohonan akademik dan upload dokumen final               |

Mapping ini diturunkan dari `apps/web/src/lib/role-redirect.ts` dan diberlakukan di sisi backend melalui `authMiddleware.RequireRole(...)` di API Gateway.

---

## Persyaratan

| Tool           | Versi Minimum  | Catatan                                                                              |
| -------------- | -------------- | ------------------------------------------------------------------------------------ |
| Go             | 1.25           | Workspace mode dengan `go.work`                                                      |
| Node.js        | 20.x           | Untuk frontend Next.js                                                               |
| npm            | 10.x           | Bawaan Node 20                                                                       |
| Docker Desktop | terbaru        | Untuk PostgreSQL & RabbitMQ                                                          |
| `protoc`       | 3.x atau lebih | Hanya jika perlu regenerasi proto                                                    |
| `goose` CLI    | v3.x           | [`pressly/goose`](https://github.com/pressly/goose) untuk eksekusi migrasi SQL       |

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/nndda-rzn/campus-flow.git
cd campus-flow
```

### 2. Jalankan Infrastruktur (PostgreSQL + RabbitMQ)

```bash
docker compose up -d
```

Layanan yang tersedia:

| Layanan     | Host & Port              | Kredensial                         |
| ----------- | ------------------------ | ---------------------------------- |
| PostgreSQL  | `localhost:5432`         | `campusflow / campusflow_password` |
| RabbitMQ    | `localhost:5672`         | `campusflow / campusflow_password` |
| RabbitMQ UI | `http://localhost:15672` | `campusflow / campusflow_password` |

Inisialisasi database (auth_db, academic_db, file_db, notification_db, reporting_db) dijalankan otomatis dari `infra/postgres/init/01-create-databases.sql`.

### 3. Jalankan Migrasi Database

Lihat bagian [Database & Migrasi](#database--migrasi) untuk detail.

### 4. Jalankan Microservices

Buka terminal terpisah untuk masing-masing service:

```bash
# Terminal 1 - Auth Service (port 50051)
go run ./apps/services/auth-service/cmd/server

# Terminal 2 - Academic Service (port 50052)
go run ./apps/services/academic-service/cmd/server

# Terminal 3 - File Service (port 50053)
go run ./apps/services/file-service/cmd/server

# Terminal 4 - Notification Service (port 50054)
go run ./apps/services/notification-service/cmd/server

# Terminal 5 - Reporting Service (port 50055)
go run ./apps/services/reporting-service/cmd/server

# Terminal 6 - API Gateway (port 8080)
go run ./apps/services/api-gateway/cmd/server
```

### 5. Jalankan Frontend

```bash
cd apps/web
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Konfigurasi Environment

### Backend (Microservices)

Setiap service membaca konfigurasi dari environment variables dengan fallback ke nilai default. Variabel yang umum:

| Variable                | Default                                                                              | Service yang Membaca              |
| ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| `DATABASE_URL`          | `postgres://campusflow:campusflow_password@localhost:5432/<db_name>?sslmode=disable` | Semua service kecuali GW          |
| `RABBITMQ_URL`          | `amqp://campusflow:campusflow_password@localhost:5672/`                              | auth, academic, file, notification, reporting |
| `JWT_SECRET`            | `campusflow_dev_secret_change_me`                                                    | auth-service                      |
| `AUTH_SERVICE_ADDR`     | `127.0.0.1:50051`                                                                    | notification-service              |
| `MAX_FILE_SIZE_BYTES`   | `10485760` (10 MB)                                                                   | file-service                      |
| `ALLOWED_MIME_TYPES`    | `application/pdf,application/msword,...,image/jpeg,image/png`                        | file-service                      |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `MAIL_FROM` | empty (stub) | auth-service (forgot password)    |

Override via shell:

```bash
# Windows (cmd)
set DATABASE_URL=postgres://user:pass@host:5432/db_name?sslmode=disable
go run ./apps/services/academic-service/cmd/server

# Bash
DATABASE_URL=postgres://user:pass@host:5432/db_name?sslmode=disable \
  go run ./apps/services/academic-service/cmd/server
```

### Frontend

Buat `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Detail lengkap ada di [`apps/web/README.md`](apps/web/README.md).

---

## Database & Migrasi

Migrasi SQL terorganisir per service di `db/<service>/migrations/`. Format penamaan: `<urutan>_<deskripsi>.sql`. Setiap file menggunakan **goose** sebagai migration tool dengan marker `-- +goose Up` dan `-- +goose Down`.

### Install Goose CLI (sekali saja)

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

Pastikan `$GOPATH/bin` (atau `$HOME/go/bin`) sudah ada di `PATH`.

### Menjalankan Migrasi (Otomatis)

Cara termudah pakai script orchestrator:

```powershell
# Windows PowerShell — apply semua migrasi
.\scripts\migrate-all.ps1

# Rollback satu langkah per service
.\scripts\migrate-all.ps1 -Down
```

```bash
# Linux/macOS — apply semua migrasi
./scripts/migrate-all.sh

# Rollback satu langkah per service
./scripts/migrate-all.sh down
```

### Menjalankan Migrasi Manual (Per-Service)

```bash
# Auth
cd db/auth/migrations
goose postgres "postgres://campusflow:campusflow_password@localhost:5432/auth_db?sslmode=disable" up

# Academic
cd db/academic/migrations
goose postgres "postgres://campusflow:campusflow_password@localhost:5432/academic_db?sslmode=disable" up

# File
cd db/file/migrations
goose postgres "postgres://campusflow:campusflow_password@localhost:5432/file_db?sslmode=disable" up

# Notification
cd db/notification/migrations
goose postgres "postgres://campusflow:campusflow_password@localhost:5432/notification_db?sslmode=disable" up

# Reporting
cd db/reporting/migrations
goose postgres "postgres://campusflow:campusflow_password@localhost:5432/reporting_db?sslmode=disable" up
```

### Goose Commands

| Command                                | Deskripsi                                          |
| -------------------------------------- | -------------------------------------------------- |
| `goose postgres "<url>" up`            | Apply semua pending migrations                     |
| `goose postgres "<url>" down`          | Rollback satu migrasi terakhir                     |
| `goose postgres "<url>" status`        | Lihat status migrasi (applied / pending)           |
| `goose postgres "<url>" version`       | Tampilkan versi DB saat ini                        |
| `goose postgres "<url>" up-to <N>`     | Migrate sampai versi tertentu                      |
| `goose postgres "<url>" down-to <N>`   | Rollback sampai versi tertentu                     |
| `goose create <name> sql`              | Generate file migrasi baru dengan template goose   |

### Override Environment Variables

Script `migrate-all.ps1` / `migrate-all.sh` honor variabel berikut:

```bash
DB_USER=campusflow
DB_PASSWORD=campusflow_password
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable
```

---

## Generate Protobuf

Source `.proto` ada di `proto/`. Hasil generate Go disimpan di `proto/gen/` dan **sudah di-commit** untuk menyederhanakan setup.

Regenerasi hanya jika kontrak proto berubah:

```powershell
# Windows PowerShell
.\scripts\gen-proto.ps1
```

Pastikan `protoc`, `protoc-gen-go`, dan `protoc-gen-go-grpc` sudah terpasang di `PATH`.

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

---

## Menjalankan Services

| Service              | Perintah                                                 | Port  |
| -------------------- | -------------------------------------------------------- | ----- |
| API Gateway          | `go run ./apps/services/api-gateway/cmd/server`          | 8080  |
| Auth Service         | `go run ./apps/services/auth-service/cmd/server`         | 50051 |
| Academic Service     | `go run ./apps/services/academic-service/cmd/server`     | 50052 |
| File Service         | `go run ./apps/services/file-service/cmd/server`         | 50053 |
| Notification Service | `go run ./apps/services/notification-service/cmd/server` | 50054 |
| Reporting Service    | `go run ./apps/services/reporting-service/cmd/server`    | 50055 |
| Web Frontend         | `npm run dev` (di `apps/web/`)                           | 3000  |

Health check sederhana untuk API Gateway:

```bash
curl http://localhost:8080/health
# api-gateway healthy
```

---

## API Reference Singkat

Semua endpoint melalui API Gateway pada `http://localhost:8080`. Endpoint terproteksi memerlukan header:

```
Authorization: Bearer <access_token>
```

### Public

| Method | Endpoint                | Deskripsi                         |
| ------ | ----------------------- | --------------------------------- |
| POST   | `/api/v1/auth/register` | Register user baru                |
| POST   | `/api/v1/auth/login`    | Login (mendapat access & refresh) |
| POST   | `/api/v1/auth/refresh`  | Tukar refresh token               |
| POST   | `/api/v1/auth/validate` | Validasi access token             |
| POST   | `/api/v1/auth/logout`   | Logout & revoke refresh token     |
| GET    | `/health`               | Health check                      |

### Protected — Profile

| Method | Endpoint     | Role       |
| ------ | ------------ | ---------- |
| GET    | `/api/v1/me` | Semua role |

### Protected — Academic Requests

| Method   | Endpoint                                                       | Role                                          |
| -------- | -------------------------------------------------------------- | --------------------------------------------- |
| GET      | `/api/v1/academic-services`                                    | Semua role                                    |
| GET      | `/api/v1/admin/academic-requests`                              | ADMIN_PRODI, KAPRODI, TATA_USAHA, SUPER_ADMIN |
| GET/POST | `/api/v1/student/academic-requests`                            | MAHASISWA                                     |
| POST     | `/api/v1/admin/academic-requests/verify`                       | ADMIN_PRODI, SUPER_ADMIN                      |
| POST     | `/api/v1/head/academic-requests/approve`                       | KAPRODI, SUPER_ADMIN                          |
| POST     | `/api/v1/head/academic-requests/reject`                        | KAPRODI, SUPER_ADMIN                          |
| POST     | `/api/v1/staff/academic-requests/complete`                     | TATA_USAHA, SUPER_ADMIN                       |
| POST     | `/api/v1/student/academic-requests/upload-supporting-document` | MAHASISWA                                     |
| POST     | `/api/v1/staff/academic-requests/upload-final-document`        | TATA_USAHA, SUPER_ADMIN                       |
| GET      | `/api/v1/academic-requests/files`                              | Semua role yang berwenang                     |
| GET      | `/api/v1/files/download`                                       | Semua role                                    |

### Protected — Supervisor Requests

| Method   | Endpoint                                      | Role                     |
| -------- | --------------------------------------------- | ------------------------ |
| GET      | `/api/v1/lecturers`                           | Semua role               |
| GET/POST | `/api/v1/student/supervisor-requests`         | MAHASISWA                |
| POST     | `/api/v1/admin/supervisor-requests/verify`    | ADMIN_PRODI, SUPER_ADMIN |
| POST     | `/api/v1/head/supervisor-requests/assign`     | KAPRODI, SUPER_ADMIN     |
| GET      | `/api/v1/lecturer/supervisor-requests`        | DOSEN                    |
| POST     | `/api/v1/lecturer/supervisor-requests/accept` | DOSEN                    |
| POST     | `/api/v1/lecturer/supervisor-requests/reject` | DOSEN                    |

### Protected — Lecturer Portal (DOSEN)

| Method   | Endpoint                                                   | Deskripsi                                          |
| -------- | ---------------------------------------------------------- | -------------------------------------------------- |
| GET/PUT  | `/api/v1/lecturer/profile`                                 | Lihat/edit profil dosen self-service               |
| GET      | `/api/v1/lecturer/dashboard`                               | Agregat KPI dashboard dosen                        |
| GET      | `/api/v1/lecturer/quota`                                   | Kuota pembimbing per tahun akademik                |
| GET      | `/api/v1/lecturer/guidance-logs`                           | List logbook bimbingan                             |
| GET      | `/api/v1/lecturer/supervised-students/progress`            | List mahasiswa bimbingan dengan progress           |
| GET      | `/api/v1/lecturer/consultation-slots`                      | List slot konsultasi                               |
| POST     | `/api/v1/lecturer/consultation-slots`                      | Buat slot baru                                     |
| PUT      | `/api/v1/lecturer/consultation-slots/{id}`                 | Edit slot                                          |
| DELETE   | `/api/v1/lecturer/consultation-slots/{id}`                 | Batalkan slot                                      |
| GET      | `/api/v1/lecturer/consultation-bookings`                   | List booking masuk                                 |
| POST     | `/api/v1/lecturer/consultation-bookings/{id}/approve`      | Approve booking                                    |
| POST     | `/api/v1/lecturer/consultation-bookings/{id}/reject`       | Reject booking                                     |
| POST     | `/api/v1/lecturer/consultation-bookings/{id}/reschedule`   | Propose alternative slot                           |
| GET      | `/api/v1/lecturer/final-documents`                         | List dokumen skripsi (filter status, pagination)   |
| GET      | `/api/v1/lecturer/final-documents/{id}`                    | Detail dokumen skripsi                             |
| POST     | `/api/v1/lecturer/final-documents/start-review`            | SUBMITTED → UNDER_REVIEW                           |
| POST     | `/api/v1/lecturer/final-documents/approve`                 | UNDER_REVIEW → APPROVED                            |
| POST     | `/api/v1/lecturer/final-documents/request-revision`        | UNDER_REVIEW → REVISION_REQUESTED                  |
| POST     | `/api/v1/lecturer/final-documents/reject`                  | UNDER_REVIEW → REJECTED                            |

### Protected — Notifications & Reports

| Method | Endpoint                              | Role                                          |
| ------ | ------------------------------------- | --------------------------------------------- |
| GET    | `/api/v1/notifications`               | Semua role                                    |
| POST   | `/api/v1/notifications/read`          | Semua role                                    |
| GET    | `/api/v1/reports/academic-requests`   | SUPER_ADMIN, ADMIN_PRODI, KAPRODI, TATA_USAHA |
| GET    | `/api/v1/reports/supervisor-requests` | SUPER_ADMIN, ADMIN_PRODI, KAPRODI, TATA_USAHA |

---

## Pengujian

Repository memuat **property-based test** dan **bug condition test** di academic service:

```bash
# Bug condition test
go test ./apps/services/academic-service/cmd/server/...

# Repository preservation test
go test ./apps/services/academic-service/internal/repository/...

# Frontend lint
cd apps/web && npm run lint
```

> Test framework yang dipakai: standard `testing` + property-based testing untuk preservation properties pada layer repository.

---

## Konvensi & Best Practice

### Backend

- **Database per service**, akses lintas service hanya via gRPC (jangan query DB service lain).
- **Outbox pattern** untuk semua event yang harus reliable. Pola sudah ada di academic service sebagai referensi.
- **Internal package layout** mengikuti separasi `handler / service / repository / model`. Hindari mencampur layer.
- **Error handling** menggunakan error wrapping (`fmt.Errorf("operasi: %w", err)`) untuk preserve stack semantic.
- **Connection pooling** PostgreSQL via `pgxpool` (sudah default di tiap service).

### Frontend

- **API client per domain** (`*-api.ts`). Hindari `fetch` langsung di komponen.
- **Design tokens** dari `globals.css`. Hindari hex literal di komponen.
- **Server vs Client Component** — gunakan `"use client"` hanya bila perlu (state, effect, browser API).
- **Path alias** `@/` untuk semua import dari `src/`.
- **Lint sebelum commit**: `npm run lint`.

### Git & Commit

- Pesan commit menggunakan **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, dst.).
- Branch utama: `main`. Buat feature branch untuk perubahan signifikan.
- File generated (proto) di-commit untuk kemudahan onboarding.

---

## Multi-tenancy & Academic Year

### Departmental Scoping (FR-277)

Admin Prodi dan Kaprodi terikat pada satu atau lebih program studi melalui tabel pivot `user_department_scopes`. SUPER_ADMIN tidak terikat scope (akses semua data).

- Saat membuat user dengan role ADMIN_PRODI atau KAPRODI di `/admin/users`, dialog akan **wajib meminta minimal 1 program studi**.
- Scope dapat diubah kapan saja via tombol "Scope" di tabel users.
- Endpoint:
  - `GET  /api/v1/admin/users/scope?user_id=...` — list prodi yang menjadi scope.
  - `POST /api/v1/admin/users/scope/set` — replace dengan list baru.

### Academic Year Context (FR-278)

Setiap pengajuan akademik dan supervisor request dikaitkan ke tahun akademik aktif saat dibuat.

- **Hanya satu tahun akademik aktif pada satu waktu** (dijaga oleh partial unique index `one_active_academic_year`).
- Saat ada pengajuan baru, sistem auto-stamp `academic_year_id` dari tahun aktif.
- Migrasi `007_academic_years.sql` melakukan **backfill data lama** ke tahun aktif default (`2025-2026-GENAP`) sehingga reporting historis tetap meaningful.
- Endpoint:
  - `GET  /api/v1/academic-years` — daftar semua tahun akademik (any authenticated).
  - `GET  /api/v1/academic-years/active` — tahun yang sedang aktif.
  - `POST /api/v1/admin/academic-years/create` (SUPER_ADMIN).
  - `POST /api/v1/admin/academic-years/set-active` (SUPER_ADMIN) — auto-demote tahun aktif sebelumnya dalam transaksi yang sama.
- UI: `/admin/academic-years` (Super Admin only).

---

## Self-service Authentication

### Forgot / Reset Password (FR-271)

Alur lupa password lengkap dengan token sekali pakai berdurasi 30 menit:

1. User klik "Lupa password?" di `/login` → diarahkan ke `/forgot-password`.
2. Sistem generate raw token (32 bytes hex), simpan **SHA-256 hash** di `password_reset_tokens`, kirim **raw token** lewat email.
3. User klik link `/reset-password?token=...` → input password baru → verifikasi hash + tandai `used_at` + revoke semua refresh token user.
4. Response untuk request reset selalu **enumeration-safe** — sistem tidak konfirmasi keberadaan email.

#### Email Backend

- **Default (development):** `stubSender` — log body email ke stdout. Cukup untuk testing E2E tanpa setup SMTP.
- **Production:** set env `SMTP_HOST` (+ `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`) dan auth-service otomatis switch ke `smtpSender` (pakai `net/smtp` standard library, tanpa external dependency).

```bash
# Production example
export SMTP_HOST=smtp.sendgrid.net
export SMTP_PORT=587
export SMTP_USERNAME=apikey
export SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxx
export MAIL_FROM=no-reply@kampus.id
```

### Change Password (Self-service)

User yang sudah login bisa ganti password dari `/profile`. Setelah berhasil, **semua refresh token user di-revoke** sehingga sesi di perangkat lain dipaksa logout.

Endpoint: `POST /api/v1/me/change-password { current_password, new_password }` (min 8 char, beda dari current).

---

## SLA Tracking & Reminders

### Due Date Tracking (FR-254)

Setiap pengajuan akademik baru otomatis dapat `due_at = NOW() + 5 hari`. Empat timestamp lain tercatat saat transisi: `verified_at`, `approved_at`, `completed_at`.

UI menampilkan `SLABadge`:
- **Merah** — overdue
- **Amber** — `< 24` jam tersisa
- **Slate** — `> 24` jam tersisa
- **Hidden** — pengajuan terminal (COMPLETED / REJECTED / CANCELLED)

### Reminder Cron (FR-266)

Worker `StartSLAReminderWorker` di academic-service scan tiap 1 jam (configurable):

- Filter: `status NOT IN terminal AND due_at < NOW() + 24h AND last_sla_warning_at older than 23h`.
- Concurrency-safe pakai `FOR UPDATE SKIP LOCKED` sehingga multi-replica tidak double-emit.
- Update `last_sla_warning_at` + insert event `academic_request.sla_warning` dalam transaksi yang sama (idempotent retry).
- Notification consumer mapping: WARNING-level notif ke mahasiswa pemilik pengajuan.

---

## Comment Threads & Bulk Operations

### Discussion Threads (FR-260)

Append-only chat per pengajuan akademik dan supervisor request. Dosen dapat balasan-balasan dengan mahasiswa tanpa perlu mensubmit ulang pengajuan.

- Tabel `request_comments` (request_type ACADEMIC | SUPERVISOR).
- Tampil di expand row admin & student academic-requests.
- Role-tinted bubble per author (Mahasiswa biru, Admin Prodi accent, Kaprodi amber, dst).

### Bulk Verify (FR-255)

Admin Prodi bisa pilih multiple pengajuan SUBMITTED dengan checkbox dan verifikasi sekaligus dengan note bersama. Maksimal 100 per batch, partial failure tolerated.

Endpoint: `POST /api/v1/admin/academic-requests/bulk-verify { request_ids[], note }`.

### CSV Export (FR-256)

Tiga endpoint reporting mendukung `?format=csv`:

- `/api/v1/reports/academic-requests?format=csv`
- `/api/v1/reports/supervisor-requests?format=csv`
- `/api/v1/reports/lecturer-workload?format=csv`

Browser auto-download file dengan nama bertanggal (`academic-requests-20260517.csv`). Frontend menggunakan fetch dengan Authorization header lalu trigger download via Blob URL — bypassing browser limitation untuk href download dengan custom header.

---

## Roadmap

Sudah selesai (commit history `git log --oneline`):

- [x] Workflow approval lengkap untuk academic & supervisor (Epic 1)
- [x] User & data master management dengan auto-stub PENDING_BIND (Epic 2)
- [x] File service hardening (mime/size validation, outbox file.uploaded / file.attached) (Epic 3)
- [x] Reporting v2 + audit log viewer + lecturer workload (Epic 4)
- [x] Frontend polish: profile, final docs queue, supervised students (Epic 5)
- [x] Containerize per service (multi-stage Dockerfile) + compose stack lengkap (Epic 6 + 8)
- [x] Migrate runner script PowerShell + Bash di `scripts/` (Epic 6)
- [x] Structured logging + request ID middleware di gateway (Epic 8)
- [x] Graceful shutdown SIGINT/SIGTERM + `/healthz`, `/readyz` (Epic 8)
- [x] CI/CD GitHub Actions: lint + test + build (Epic 8)
- [x] Announcements, SLA tracking, visual timeline (Epic 9)
- [x] Multi-tenancy (departmental scope) + academic year context (Epic 10a)
- [x] Comment threads, bulk verify, CSV export (Epic 10b)
- [x] Forgot password + SMTP abstraction + SLA reminder cron (Epic 10c)
- [x] **Lecturer Portal Enhancement (Epic 11)** — profile self-service, dashboard agregat, quota visibility, edit slot konsultasi, halaman pengumuman dosen
- [x] **Thesis Final Document Review (Epic 12)** — workflow review skripsi oleh dosen pembimbing dengan state machine (SUBMITTED → UNDER_REVIEW → APPROVED/REVISION_REQUESTED/REJECTED), file integration, ownership check

Belum tertutup (kandidat enterprise berikutnya):

- [ ] Object storage (S3-compatible) untuk file service di production
- [ ] Idempotency key & dead-letter queue di message consumer
- [ ] E2E testing dengan Playwright untuk frontend
- [ ] Observability: Prometheus metrics + OpenTelemetry tracing
- [ ] 2FA TOTP untuk role admin (Super Admin / Kaprodi)
- [ ] Webhook outbound + API key untuk integrasi external (SIAKAD, sistem keuangan)
- [ ] Workflow type per service (`SIMPLE` / `STANDARD` / `EXTENDED`) dengan dynamic field schema
- [ ] PDF preview inline + document templates dengan merge fields
- [ ] Saved filters dan quick-action templates per role
- [ ] Data retention policy (archive after N years) + immutable audit log

---

## Lisensi

Proyek ini bersifat **internal** dan diperuntukkan untuk lingkungan akademik tertentu. Hubungi pemilik repository untuk informasi lisensi, distribusi, dan kontribusi.

---

<div align="center">

**CampusFlow** — Built with care using Go, Next.js, and a healthy respect for clean architecture.

[![Go](https://img.shields.io/badge/Made%20with-Go-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Made%20with-Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)

</div>
