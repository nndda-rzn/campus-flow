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
| `DOSEN`       | `/lecturer`   | Lihat dan respons (accept/reject) permohonan pembimbing yang masuk       |
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
| `migrate` CLI  | opsional       | [`golang-migrate`](https://github.com/golang-migrate/migrate) untuk eksekusi migrasi |

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

| Variable       | Default                                                                              | Service yang Membaca              |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| `DATABASE_URL` | `postgres://campusflow:campusflow_password@localhost:5432/<db_name>?sslmode=disable` | Semua service kecuali GW          |
| `RABBITMQ_URL` | `amqp://campusflow:campusflow_password@localhost:5672/`                              | academic, notification, reporting |
| `JWT_SECRET`   | dikonfigurasi di auth-service                                                        | auth-service                      |

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

Migrasi SQL terorganisir per service di `db/<service>/migrations/`. Format penamaan: `<urutan>_<deskripsi>.sql`.

### Menjalankan Migrasi dengan `golang-migrate`

```bash
# Install CLI (sekali saja)
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Auth
migrate -path db/auth/migrations \
  -database "postgres://campusflow:campusflow_password@localhost:5432/auth_db?sslmode=disable" up

# Academic
migrate -path db/academic/migrations \
  -database "postgres://campusflow:campusflow_password@localhost:5432/academic_db?sslmode=disable" up

# File
migrate -path db/file/migrations \
  -database "postgres://campusflow:campusflow_password@localhost:5432/file_db?sslmode=disable" up

# Notification
migrate -path db/notification/migrations \
  -database "postgres://campusflow:campusflow_password@localhost:5432/notification_db?sslmode=disable" up

# Reporting
migrate -path db/reporting/migrations \
  -database "postgres://campusflow:campusflow_password@localhost:5432/reporting_db?sslmode=disable" up
```

> Tip: simpan kelima perintah di atas sebagai script lokal (`scripts/migrate-all.ps1`) supaya mudah dijalankan.

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

## Roadmap

- [ ] Containerize semua microservice (Dockerfile per service + multi-stage build)
- [ ] Compose stack lengkap (services + infra) untuk single-command startup
- [ ] Migrate runner script (PowerShell + Bash) di `scripts/`
- [ ] Observability: structured logging, metrics (Prometheus), tracing (OpenTelemetry)
- [ ] CI/CD pipeline (GitHub Actions: lint, test, build)
- [ ] Object storage (S3-compatible) untuk file service di production
- [ ] Idempotency key & dead-letter queue di message consumer
- [ ] E2E testing dengan Playwright untuk frontend

---

## Lisensi

Proyek ini bersifat **internal** dan diperuntukkan untuk lingkungan akademik tertentu. Hubungi pemilik repository untuk informasi lisensi, distribusi, dan kontribusi.

---

<div align="center">

**CampusFlow** — Built with care using Go, Next.js, and a healthy respect for clean architecture.

[![Go](https://img.shields.io/badge/Made%20with-Go-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Made%20with-Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)

</div>
