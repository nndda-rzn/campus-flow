# CampusFlow — Functional & Non-Functional Requirements

**Versi:** 1.0  
**Tanggal:** Mei 2026  
**Status:** Aktif — berdasarkan implementasi tahap 0–26  
**Scope:** MVP enterprise-style, deployment lokal dengan Docker Compose

---

## Daftar Isi

1. [Gambaran Sistem](#1-gambaran-sistem)
2. [Aktor dan Peran](#2-aktor-dan-peran)
3. [Functional Requirements (FR)](#3-functional-requirements)
   - FR-01: Authentication & Session
   - FR-02: Authorization & RBAC
   - FR-03: Academic Service Request
   - FR-04: Supervisor Request
   - FR-05: File Management
   - FR-06: Notification
   - FR-07: Reporting & Dashboard
   - FR-08: Audit & History
4. [Non-Functional Requirements (NFR)](#4-non-functional-requirements)
   - NFR-01: Performance
   - NFR-02: Security
   - NFR-03: Reliability & Availability
   - NFR-04: Maintainability
   - NFR-05: Scalability
   - NFR-06: Observability
   - NFR-07: Usability
   - NFR-08: Compliance & Data Integrity
5. [Batasan Sistem](#5-batasan-sistem)
6. [Asumsi](#6-asumsi)
7. [Traceability Matrix](#7-traceability-matrix)

---

## 1. Gambaran Sistem

CampusFlow adalah sistem layanan akademik kampus berbasis web yang mendigitalisasi dua proses utama:

1. **Pengajuan layanan akademik** — surat aktif kuliah, surat magang, izin penelitian, surat rekomendasi.
2. **Pengajuan dosen pembimbing** — pengajuan topik, pilihan calon dosen, penetapan, dan persetujuan dosen.

Sistem dibangun dengan arsitektur enterprise-style: Next.js frontend, Go microservices, API Gateway REST, komunikasi internal gRPC, event-driven integration via RabbitMQ, PostgreSQL database per service, dan transactional outbox pattern.

---

## 2. Aktor dan Peran

| Role        | Kode          | Deskripsi                                              |
| ----------- | ------------- | ------------------------------------------------------ |
| Super Admin | `SUPER_ADMIN` | Pengelola sistem tertinggi, akses penuh ke semua fitur |
| Admin Prodi | `ADMIN_PRODI` | Petugas administrasi prodi, verifikasi pengajuan       |
| Mahasiswa   | `MAHASISWA`   | Pengguna utama, membuat dan memantau pengajuan         |
| Dosen       | `DOSEN`       | Calon pembimbing, menerima atau menolak penetapan      |
| Kaprodi     | `KAPRODI`     | Kepala prodi, approve/reject dan tetapkan dosen        |
| Tata Usaha  | `TATA_USAHA`  | Petugas dokumen final, upload dan selesaikan pengajuan |

---

## 3. Functional Requirements

### FR-01: Authentication & Session

| ID       | Requirement                                                                                               | Priority | Status         |
| -------- | --------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-01-01 | Sistem harus menyediakan endpoint registrasi user dengan field: `full_name`, `email`, `password`, `role`. | High     | ✅ Implemented |
| FR-01-02 | Sistem harus memvalidasi format email dan keunikan email saat registrasi.                                 | High     | ✅ Implemented |
| FR-01-03 | Password harus di-hash menggunakan bcrypt sebelum disimpan ke database.                                   | High     | ✅ Implemented |
| FR-01-04 | Sistem harus menyediakan endpoint login yang mengembalikan JWT access token dan refresh token.            | High     | ✅ Implemented |
| FR-01-05 | Access token harus memuat klaim: `sub` (user_id), `role`, `email`, `full_name`, `iss`, `exp`, `iat`.      | High     | ✅ Implemented |
| FR-01-06 | Refresh token harus berupa random string, di-hash sebelum disimpan ke tabel `refresh_tokens`.             | High     | ✅ Implemented |
| FR-01-07 | Sistem harus menyediakan endpoint refresh token yang mengembalikan access token baru.                     | High     | ✅ Implemented |
| FR-01-08 | Sistem harus menyediakan endpoint logout yang merevoke refresh token aktif.                               | High     | ✅ Implemented |
| FR-01-09 | Sistem harus menyediakan endpoint validasi token untuk keperluan internal API Gateway.                    | High     | ✅ Implemented |
| FR-01-10 | Frontend harus menyimpan `access_token`, `refresh_token`, dan `user` di localStorage (MVP).               | Medium   | ✅ Implemented |
| FR-01-11 | Frontend harus mencoba refresh token otomatis saat menerima respons 401 dari API.                         | High     | ✅ Implemented |
| FR-01-12 | Jika refresh token gagal atau tidak ada, frontend harus membersihkan sesi dan redirect ke `/login`.       | High     | ✅ Implemented |
| FR-01-13 | Sistem harus menyediakan endpoint `GET /api/v1/me` untuk mengambil `user_id` dan `role` dari token aktif. | Medium   | ✅ Implemented |

---

### FR-02: Authorization & RBAC

| ID       | Requirement                                                                                                  | Priority | Status         |
| -------- | ------------------------------------------------------------------------------------------------------------ | -------- | -------------- |
| FR-02-01 | Setiap request ke endpoint protected harus menyertakan header `Authorization: Bearer <token>`.               | High     | ✅ Implemented |
| FR-02-02 | API Gateway harus memvalidasi token ke auth-service via gRPC sebelum meneruskan request.                     | High     | ✅ Implemented |
| FR-02-03 | API Gateway harus menyimpan `user_id` dan `role` ke request context setelah validasi berhasil.               | High     | ✅ Implemented |
| FR-02-04 | Endpoint yang memerlukan role tertentu harus dilindungi middleware `RequireRole`.                            | High     | ✅ Implemented |
| FR-02-05 | Frontend harus melindungi halaman menggunakan komponen `ProtectedPage` dengan prop `allowedRoles`.           | High     | ✅ Implemented |
| FR-02-06 | Jika user mengakses halaman dengan role yang tidak sesuai, sistem harus menampilkan halaman "Akses Ditolak". | Medium   | ✅ Implemented |
| FR-02-07 | Role `SUPER_ADMIN` harus memiliki akses ke semua endpoint yang dibatasi role lain.                           | High     | ✅ Implemented |

---

### FR-03: Academic Service Request

#### FR-03-A: Manajemen Layanan Akademik

| ID       | Requirement                                                                                                 | Priority | Status         |
| -------- | ----------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-03-01 | Sistem harus menyediakan daftar jenis layanan akademik yang aktif (`is_active = TRUE`).                     | High     | ✅ Implemented |
| FR-03-02 | Jenis layanan yang tersedia pada MVP: Surat Aktif Kuliah, Surat Magang, Izin Penelitian, Surat Rekomendasi. | High     | ✅ Implemented |
| FR-03-03 | Setiap layanan memiliki atribut: `id`, `code`, `name`, `description`, `is_active`.                          | Medium   | ✅ Implemented |

#### FR-03-B: Pembuatan Pengajuan (MAHASISWA)

| ID       | Requirement                                                                                                    | Priority | Status         |
| -------- | -------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-03-04 | Mahasiswa harus dapat membuat pengajuan layanan akademik dengan field: `service_code`, `title`, `description`. | High     | ✅ Implemented |
| FR-03-05 | Sistem harus menghasilkan `request_number` unik dengan format `CF-REQ-{YYYYMMDDHHMMSS}-{6digit}`.              | High     | ✅ Implemented |
| FR-03-06 | Status awal pengajuan harus `SUBMITTED`.                                                                       | High     | ✅ Implemented |
| FR-03-07 | Sistem harus mencatat riwayat status awal ke tabel `request_status_histories`.                                 | High     | ✅ Implemented |
| FR-03-08 | Sistem harus mencatat aktivitas pembuatan ke tabel `audit_logs`.                                               | High     | ✅ Implemented |
| FR-03-09 | Sistem harus mempublikasikan event `academic_request.created` ke RabbitMQ via outbox pattern.                  | High     | ✅ Implemented |
| FR-03-10 | Mahasiswa harus dapat melihat daftar pengajuan miliknya sendiri.                                               | High     | ✅ Implemented |

#### FR-03-C: Workflow Approval

| ID       | Requirement                                                                               | Priority | Status         |
| -------- | ----------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-03-11 | Admin Prodi harus dapat memverifikasi pengajuan berstatus `SUBMITTED` → `VERIFIED`.       | High     | ✅ Implemented |
| FR-03-12 | Kaprodi harus dapat menyetujui pengajuan berstatus `VERIFIED` → `APPROVED`.               | High     | ✅ Implemented |
| FR-03-13 | Kaprodi harus dapat menolak pengajuan berstatus `VERIFIED` → `REJECTED`.                  | High     | ✅ Implemented |
| FR-03-14 | Tata Usaha harus dapat menyelesaikan pengajuan berstatus `APPROVED` → `COMPLETED`.        | High     | ✅ Implemented |
| FR-03-15 | Setiap aksi workflow harus mencatat perubahan status ke `request_status_histories`.       | High     | ✅ Implemented |
| FR-03-16 | Setiap aksi workflow harus mencatat approval ke tabel `request_approvals`.                | High     | ✅ Implemented |
| FR-03-17 | Setiap aksi workflow harus mencatat aktivitas ke `audit_logs`.                            | High     | ✅ Implemented |
| FR-03-18 | Setiap aksi workflow harus mempublikasikan event domain ke RabbitMQ.                      | High     | ✅ Implemented |
| FR-03-19 | Transisi status yang tidak valid harus ditolak dengan error `ErrInvalidStatusTransition`. | High     | ✅ Implemented |
| FR-03-20 | Setiap aksi workflow harus menggunakan database transaction untuk menjamin atomicity.     | High     | ✅ Implemented |

#### FR-03-D: List Pengajuan untuk Role Internal

| ID       | Requirement                                                                            | Priority | Status         |
| -------- | -------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-03-21 | Admin Prodi, Kaprodi, Tata Usaha, dan Super Admin harus dapat melihat semua pengajuan. | High     | ✅ Implemented |
| FR-03-22 | Endpoint list semua pengajuan harus mendukung filter opsional berdasarkan `status`.    | Medium   | ✅ Implemented |

---

### FR-04: Supervisor Request

#### FR-04-A: Pembuatan Pengajuan Pembimbing (MAHASISWA)

| ID       | Requirement                                                                                                                  | Priority | Status         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-04-01 | Mahasiswa harus dapat membuat pengajuan dosen pembimbing dengan field: `topic_title`, `topic_description`, `lecturer_ids[]`. | High     | ✅ Implemented |
| FR-04-02 | Mahasiswa harus dapat memilih lebih dari satu calon dosen dengan urutan prioritas.                                           | Medium   | ✅ Implemented |
| FR-04-03 | Sistem harus menghasilkan `request_number` unik untuk setiap pengajuan pembimbing.                                           | High     | ✅ Implemented |
| FR-04-04 | Status awal pengajuan pembimbing harus `SUBMITTED`.                                                                          | High     | ✅ Implemented |
| FR-04-05 | Mahasiswa harus dapat melihat daftar dosen aktif beserta kuota pembimbing.                                                   | Medium   | ✅ Implemented |
| FR-04-06 | Mahasiswa harus dapat melihat daftar pengajuan pembimbing miliknya.                                                          | High     | ✅ Implemented |

#### FR-04-B: Workflow Supervisor Request

| ID       | Requirement                                                                          | Priority | Status         |
| -------- | ------------------------------------------------------------------------------------ | -------- | -------------- |
| FR-04-07 | Admin Prodi harus dapat memverifikasi pengajuan pembimbing `SUBMITTED` → `VERIFIED`. | High     | ✅ Implemented |
| FR-04-08 | Kaprodi harus dapat menetapkan dosen pembimbing `VERIFIED` → `ASSIGNED`.             | High     | ✅ Implemented |
| FR-04-09 | Dosen harus dapat menerima penetapan `ASSIGNED` → `ACCEPTED`.                        | High     | ✅ Implemented |
| FR-04-10 | Dosen harus dapat menolak penetapan `ASSIGNED` → `REJECTED`.                         | High     | ✅ Implemented |
| FR-04-11 | Dosen harus dapat melihat daftar pengajuan yang ditetapkan kepadanya.                | High     | ✅ Implemented |
| FR-04-12 | Setiap aksi workflow supervisor harus mencatat riwayat status dan audit log.         | High     | ✅ Implemented |
| FR-04-13 | Setiap aksi workflow supervisor harus mempublikasikan event domain ke RabbitMQ.      | High     | ✅ Implemented |

---

### FR-05: File Management

#### FR-05-A: Upload

| ID       | Requirement                                                                                                              | Priority | Status         |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | -------- | -------------- |
| FR-05-01 | Mahasiswa harus dapat mengupload dokumen pendukung (`SUPPORTING_DOCUMENT`) untuk pengajuan akademik miliknya.            | High     | ✅ Implemented |
| FR-05-02 | Tata Usaha dan Super Admin harus dapat mengupload dokumen final (`FINAL_DOCUMENT`) untuk pengajuan berstatus `APPROVED`. | High     | ✅ Implemented |
| FR-05-03 | Sistem harus memvalidasi ekstensi file yang diizinkan: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.doc`, `.docx`.                 | High     | ✅ Implemented |
| FR-05-04 | Ukuran file maksimal yang diizinkan adalah 10 MB.                                                                        | High     | ✅ Implemented |
| FR-05-05 | Sistem harus menyimpan file dengan nama acak (random hex 16 byte + ekstensi asli) untuk mencegah konflik nama.           | High     | ✅ Implemented |
| FR-05-06 | File disimpan di path: `storage/uploads/academic-requests/{request_id}/{purpose}/{stored_name}`.                         | High     | ✅ Implemented |
| FR-05-07 | Metadata file harus didaftarkan ke file-service via gRPC setelah file berhasil disimpan.                                 | High     | ✅ Implemented |
| FR-05-08 | Jika registrasi metadata gagal, file fisik harus dihapus untuk menjaga konsistensi.                                      | High     | ✅ Implemented |

#### FR-05-B: List dan Download

| ID       | Requirement                                                                                         | Priority | Status         |
| -------- | --------------------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-05-09 | User yang terautentikasi harus dapat melihat daftar file milik satu academic request.               | High     | ✅ Implemented |
| FR-05-10 | Mahasiswa hanya boleh mengakses file dari pengajuan miliknya sendiri.                               | High     | ✅ Implemented |
| FR-05-11 | Role internal (Admin Prodi, Kaprodi, Tata Usaha, Super Admin) boleh mengakses file semua pengajuan. | High     | ✅ Implemented |
| FR-05-12 | User yang terautentikasi harus dapat mendownload file sesuai hak akses.                             | High     | ✅ Implemented |
| FR-05-13 | Sistem harus memvalidasi bahwa path file berada dalam direktori `storage/uploads/` sebelum serving. | High     | ✅ Implemented |
| FR-05-14 | Sistem harus mencatat setiap aksi download ke tabel `file_access_logs`.                             | Medium   | ✅ Implemented |
| FR-05-15 | Response download harus menyertakan header `Content-Disposition: attachment` dengan nama file asli. | Medium   | ✅ Implemented |

---

### FR-06: Notification

| ID       | Requirement                                                                                             | Priority | Status         |
| -------- | ------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-06-01 | Sistem harus mengirimkan notifikasi in-app kepada mahasiswa saat status pengajuan berubah.              | High     | ✅ Implemented |
| FR-06-02 | Notifikasi harus dibuat secara asinkron melalui event RabbitMQ, bukan synchronous call.                 | High     | ✅ Implemented |
| FR-06-03 | Notification service harus mengimplementasikan inbox pattern untuk mencegah duplikasi pemrosesan event. | High     | ✅ Implemented |
| FR-06-04 | User yang terautentikasi harus dapat melihat daftar notifikasi miliknya.                                | High     | ✅ Implemented |
| FR-06-05 | User harus dapat menandai notifikasi sebagai sudah dibaca.                                              | Medium   | ✅ Implemented |
| FR-06-06 | Frontend harus menampilkan jumlah notifikasi yang belum dibaca di header navigasi.                      | Medium   | ✅ Implemented |
| FR-06-07 | Notifikasi memiliki tipe: `INFO`, `SUCCESS`, `WARNING`, `ERROR`.                                        | Low      | ✅ Implemented |
| FR-06-08 | Notifikasi harus menyimpan referensi ke entitas terkait (`entity_type`, `entity_id`).                   | Low      | ✅ Implemented |

---

### FR-07: Reporting & Dashboard

| ID       | Requirement                                                                                       | Priority | Status         |
| -------- | ------------------------------------------------------------------------------------------------- | -------- | -------------- |
| FR-07-01 | Sistem harus menyediakan dashboard laporan academic request berbasis projection/read model.       | High     | ✅ Implemented |
| FR-07-02 | Sistem harus menyediakan dashboard laporan supervisor request berbasis projection/read model.     | High     | ✅ Implemented |
| FR-07-03 | Reporting service harus mengonsumsi event dari RabbitMQ dan melakukan upsert ke snapshot table.   | High     | ✅ Implemented |
| FR-07-04 | Reporting service harus mengimplementasikan inbox pattern untuk idempotency event.                | High     | ✅ Implemented |
| FR-07-05 | Dashboard harus dapat diakses oleh role: `SUPER_ADMIN`, `ADMIN_PRODI`, `KAPRODI`, `TATA_USAHA`.   | High     | ✅ Implemented |
| FR-07-06 | Dashboard harus menampilkan agregasi jumlah pengajuan per status.                                 | High     | ✅ Implemented |
| FR-07-07 | Reporting tidak boleh melakukan query langsung ke database service lain (no cross-database join). | High     | ✅ Implemented |

---

### FR-08: Audit & History

| ID       | Requirement                                                                                                                                      | Priority | Status         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------- |
| FR-08-01 | Setiap perubahan status academic request harus dicatat di `request_status_histories` dengan `old_status`, `new_status`, `actor_user_id`, `note`. | High     | ✅ Implemented |
| FR-08-02 | Setiap aksi approval harus dicatat di `request_approvals` dengan `approver_user_id`, `approver_role`, `action`, `note`.                          | High     | ✅ Implemented |
| FR-08-03 | Aktivitas penting (create, verify, approve, reject, complete) harus dicatat di `audit_logs` dengan metadata JSONB.                               | High     | ✅ Implemented |
| FR-08-04 | Setiap aksi upload dan download file harus dicatat di `file_access_logs`.                                                                        | Medium   | ✅ Implemented |
| FR-08-05 | Audit log harus menyimpan `actor_user_id`, `action`, `entity_type`, `entity_id`, dan `metadata`.                                                 | High     | ✅ Implemented |

---

## 4. Non-Functional Requirements

### NFR-01: Performance

| ID        | Requirement                                                                                                                | Target   | Priority |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| NFR-01-01 | Response time API Gateway untuk endpoint read (GET) harus ≤ 500ms pada kondisi normal (p95).                               | ≤ 500ms  | High     |
| NFR-01-02 | Response time API Gateway untuk endpoint write (POST) harus ≤ 1000ms pada kondisi normal (p95).                            | ≤ 1000ms | High     |
| NFR-01-03 | Validasi token via gRPC ke auth-service harus selesai dalam ≤ 200ms (timeout 5 detik dikonfigurasi).                       | ≤ 200ms  | High     |
| NFR-01-04 | Upload file hingga 10 MB harus selesai dalam ≤ 10 detik pada koneksi lokal.                                                | ≤ 10s    | Medium   |
| NFR-01-05 | Event dari outbox publisher ke RabbitMQ harus dipublikasikan dalam ≤ 3 detik setelah commit (interval worker 3 detik).     | ≤ 3s     | Medium   |
| NFR-01-06 | Notifikasi harus tersedia di frontend dalam ≤ 10 detik setelah event dipublikasikan.                                       | ≤ 10s    | Medium   |
| NFR-01-07 | Halaman frontend harus mencapai First Contentful Paint (FCP) ≤ 2 detik pada koneksi lokal.                                 | ≤ 2s     | Medium   |
| NFR-01-08 | Query database harus menggunakan index yang sesuai; tidak boleh ada full table scan pada tabel dengan data > 10.000 baris. | -        | High     |

---

### NFR-02: Security

| ID        | Requirement                                                                                                                      | Priority | Status         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| NFR-02-01 | Semua password harus di-hash menggunakan bcrypt dengan cost factor ≥ 10.                                                         | High     | ✅ Implemented |
| NFR-02-02 | JWT access token harus memiliki masa berlaku yang terbatas (dikonfigurasi di auth-service).                                      | High     | ✅ Implemented |
| NFR-02-03 | Refresh token harus di-hash sebelum disimpan; token plaintext tidak boleh tersimpan di database.                                 | High     | ✅ Implemented |
| NFR-02-04 | Refresh token harus direvoke saat logout; token yang sudah direvoke tidak boleh digunakan kembali.                               | High     | ✅ Implemented |
| NFR-02-05 | API Gateway harus memvalidasi token ke auth-service pada setiap request ke endpoint protected.                                   | High     | ✅ Implemented |
| NFR-02-06 | CORS harus dikonfigurasi untuk hanya mengizinkan origin `http://localhost:3000` dan `http://127.0.0.1:3000` (development).       | High     | ✅ Implemented |
| NFR-02-07 | Preflight OPTIONS request harus ditangani dengan benar oleh CORS middleware.                                                     | High     | ✅ Implemented |
| NFR-02-08 | Path file yang di-serve harus divalidasi untuk memastikan berada dalam direktori `storage/uploads/` (path traversal prevention). | High     | ✅ Implemented |
| NFR-02-09 | Ekstensi file yang diizinkan untuk upload harus divalidasi secara whitelist (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.doc`, `.docx`).  | High     | ✅ Implemented |
| NFR-02-10 | Ukuran file upload harus dibatasi maksimal 10 MB menggunakan `http.MaxBytesReader`.                                              | High     | ✅ Implemented |
| NFR-02-11 | Akses file harus divalidasi berdasarkan role dan kepemilikan sebelum file di-serve.                                              | High     | ✅ Implemented |
| NFR-02-12 | Nama file yang disimpan harus menggunakan random hex, bukan nama asli dari user (mencegah path injection).                       | High     | ✅ Implemented |
| NFR-02-13 | Header `Content-Disposition` untuk download harus di-sanitize dari karakter berbahaya (`"`, `\r`, `\n`).                         | Medium   | ✅ Implemented |
| NFR-02-14 | Komunikasi internal antar service menggunakan gRPC tanpa TLS (acceptable untuk lokal; produksi harus mTLS).                      | Medium   | ⚠️ MVP Only    |
| NFR-02-15 | Token frontend disimpan di localStorage (acceptable untuk MVP; produksi harus httpOnly cookie).                                  | Medium   | ⚠️ MVP Only    |
| NFR-02-16 | **[Produksi]** Implementasi Redis untuk token blacklist dan rate limiting.                                                       | High     | 🔲 Planned     |
| NFR-02-17 | **[Produksi]** Validasi MIME type berdasarkan file signature (magic bytes), bukan hanya ekstensi.                                | Medium   | 🔲 Planned     |
| NFR-02-18 | **[Produksi]** Implementasi HTTPS dengan Nginx reverse proxy dan TLS certificate.                                                | High     | 🔲 Planned     |

---

### NFR-03: Reliability & Availability

| ID        | Requirement                                                                                                                   | Priority | Status         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| NFR-03-01 | Setiap operasi write yang melibatkan multiple tabel harus menggunakan database transaction untuk menjamin atomicity.          | High     | ✅ Implemented |
| NFR-03-02 | Event domain harus dipublikasikan menggunakan transactional outbox pattern untuk mencegah data commit tanpa event.            | High     | ✅ Implemented |
| NFR-03-03 | Outbox publisher worker harus berjalan sebagai goroutine terpisah dengan interval polling 3 detik.                            | High     | ✅ Implemented |
| NFR-03-04 | Notification service dan reporting service harus mengimplementasikan inbox pattern (idempotency via `event_id` unique).       | High     | ✅ Implemented |
| NFR-03-05 | Jika RabbitMQ tidak tersedia saat startup, academic-service harus tetap berjalan (outbox publisher tidak start, log warning). | High     | ✅ Implemented |
| NFR-03-06 | Setiap gRPC call dari API Gateway ke service internal harus memiliki context timeout (default 5 detik).                       | High     | ✅ Implemented |
| NFR-03-07 | Jika file fisik berhasil disimpan tetapi registrasi metadata ke file-service gagal, file fisik harus dihapus.                 | High     | ✅ Implemented |
| NFR-03-08 | Sistem harus menyediakan endpoint `GET /health` pada API Gateway untuk health check.                                          | Medium   | ✅ Implemented |
| NFR-03-09 | **[Produksi]** Implementasi retry dengan exponential backoff untuk outbox publisher saat RabbitMQ tidak tersedia.             | High     | 🔲 Planned     |
| NFR-03-10 | **[Produksi]** Implementasi dead letter queue (DLQ) untuk event yang gagal diproses consumer.                                 | High     | 🔲 Planned     |

---

### NFR-04: Maintainability

| ID        | Requirement                                                                                                                                                                        | Priority | Status         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| NFR-04-01 | Setiap service harus memiliki struktur direktori yang konsisten: `cmd/server`, `internal/config`, `internal/handler`, `internal/service`, `internal/repository`, `internal/model`. | High     | ✅ Implemented |
| NFR-04-02 | Kontrak API antar service harus didefinisikan menggunakan Protocol Buffers (`.proto` files).                                                                                       | High     | ✅ Implemented |
| NFR-04-03 | Proto generation harus dapat dijalankan dengan satu script (`.\scripts\gen-proto.ps1`).                                                                                            | Medium   | ✅ Implemented |
| NFR-04-04 | Database migration harus menggunakan Goose dengan versioning per database.                                                                                                         | High     | ✅ Implemented |
| NFR-04-05 | Setiap service harus memiliki `go.mod` sendiri; semua service dikelola dalam Go workspace (`go.work`).                                                                             | High     | ✅ Implemented |
| NFR-04-06 | Konfigurasi service harus dapat di-override melalui environment variable.                                                                                                          | High     | ✅ Implemented |
| NFR-04-07 | Error handling harus menggunakan sentinel error (`ErrInvalidInput`, `ErrNotFound`, `ErrInvalidStatusTransition`) yang di-map ke gRPC status code yang sesuai.                      | High     | ✅ Implemented |
| NFR-04-08 | Frontend harus menggunakan TypeScript strict mode untuk type safety.                                                                                                               | High     | ✅ Implemented |
| NFR-04-09 | API client frontend harus dipisahkan per domain (`academic-api.ts`, `file-api.ts`, `notification-api.ts`, dll).                                                                    | Medium   | ✅ Implemented |
| NFR-04-10 | Komponen UI yang reusable harus ditempatkan di `src/components/` dan tidak mengandung business logic.                                                                              | Medium   | ✅ Implemented |

---

### NFR-05: Scalability

| ID        | Requirement                                                                                                             | Priority | Status         |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| NFR-05-01 | Setiap microservice harus stateless sehingga dapat di-scale horizontal secara independen.                               | High     | ✅ Implemented |
| NFR-05-02 | Database harus dipisahkan per service (database per service pattern) untuk menghindari coupling.                        | High     | ✅ Implemented |
| NFR-05-03 | Komunikasi asinkron via RabbitMQ harus menggunakan topic exchange agar consumer dapat ditambah tanpa mengubah producer. | High     | ✅ Implemented |
| NFR-05-04 | Reporting service harus menggunakan read model/projection sehingga query laporan tidak membebani database operasional.  | High     | ✅ Implemented |
| NFR-05-05 | Index database harus dibuat pada kolom yang sering digunakan untuk filter dan join.                                     | High     | ✅ Implemented |
| NFR-05-06 | **[Produksi]** Implementasi connection pooling yang dikonfigurasi sesuai beban (pgxpool).                               | High     | ✅ Implemented |
| NFR-05-07 | **[Produksi]** File storage harus dipindahkan ke object storage (MinIO/S3-compatible) untuk mendukung multi-instance.   | High     | 🔲 Planned     |

---

### NFR-06: Observability

| ID        | Requirement                                                                                             | Priority | Status         |
| --------- | ------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| NFR-06-01 | Setiap service harus mencatat log startup, koneksi database, dan koneksi RabbitMQ.                      | High     | ✅ Implemented |
| NFR-06-02 | Error pada gRPC handler harus di-log dengan konteks yang cukup untuk debugging.                         | High     | ✅ Implemented |
| NFR-06-03 | Outbox publisher harus mencatat log setiap event yang berhasil dipublikasikan.                          | Medium   | ✅ Implemented |
| NFR-06-04 | **[Produksi]** Implementasi structured logging (JSON format) dengan level log yang dapat dikonfigurasi. | High     | 🔲 Planned     |
| NFR-06-05 | **[Produksi]** Implementasi request ID yang diteruskan antar service untuk distributed tracing.         | High     | 🔲 Planned     |
| NFR-06-06 | **[Produksi]** Integrasi Prometheus untuk metrics collection (request count, latency, error rate).      | Medium   | 🔲 Planned     |
| NFR-06-07 | **[Produksi]** Integrasi Grafana untuk visualisasi metrics.                                             | Medium   | 🔲 Planned     |
| NFR-06-08 | **[Produksi]** Integrasi Jaeger atau OpenTelemetry untuk distributed tracing.                           | Medium   | 🔲 Planned     |

---

### NFR-07: Usability

| ID        | Requirement                                                                                                    | Priority | Status         |
| --------- | -------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| NFR-07-01 | Halaman frontend harus responsif dan dapat digunakan pada layar desktop (min. 1024px) dan tablet (min. 768px). | High     | ✅ Implemented |
| NFR-07-02 | Setiap form harus menampilkan pesan error yang jelas dan spesifik saat validasi gagal.                         | High     | ✅ Implemented |
| NFR-07-03 | Setiap aksi yang membutuhkan waktu (submit, upload) harus menampilkan indikator loading.                       | High     | ✅ Implemented |
| NFR-07-04 | Setiap aksi yang berhasil harus menampilkan pesan konfirmasi yang jelas.                                       | High     | ✅ Implemented |
| NFR-07-05 | Status pengajuan harus ditampilkan dengan label yang mudah dipahami dalam Bahasa Indonesia.                    | Medium   | ✅ Implemented |
| NFR-07-06 | Status badge harus menggunakan warna yang konsisten dan bermakna (hijau = disetujui, merah = ditolak, dll).    | Medium   | ✅ Implemented |
| NFR-07-07 | Navigasi antar halaman harus konsisten dengan header yang sama di semua halaman protected.                     | Medium   | ✅ Implemented |
| NFR-07-08 | Halaman yang memerlukan autentikasi harus menampilkan loading state saat memeriksa sesi.                       | Medium   | ✅ Implemented |
| NFR-07-09 | Download file harus dilakukan tanpa membuka tab baru (menggunakan blob URL).                                   | Low      | ✅ Implemented |

---

### NFR-08: Compliance & Data Integrity

| ID        | Requirement                                                                                                               | Priority | Status              |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- |
| NFR-08-01 | Semua primary key harus menggunakan UUID v4 yang di-generate oleh database (`gen_random_uuid()`).                         | High     | ✅ Implemented      |
| NFR-08-02 | Kolom `created_at` dan `updated_at` harus ada pada semua tabel utama dan di-set otomatis oleh database.                   | High     | ✅ Implemented      |
| NFR-08-03 | Status field pada tabel utama harus menggunakan CHECK constraint untuk membatasi nilai yang valid.                        | High     | ✅ Implemented      |
| NFR-08-04 | Foreign key constraint harus diterapkan pada semua relasi antar tabel dalam satu database.                                | High     | ✅ Implemented      |
| NFR-08-05 | `request_number` harus unik (UNIQUE constraint) untuk mencegah duplikasi nomor pengajuan.                                 | High     | ✅ Implemented      |
| NFR-08-06 | Email user harus unik (UNIQUE constraint) di tabel `users`.                                                               | High     | ✅ Implemented      |
| NFR-08-07 | Setiap service hanya boleh mengakses database miliknya sendiri; tidak ada cross-database query.                           | High     | ✅ Implemented      |
| NFR-08-08 | Event yang sama tidak boleh diproses lebih dari satu kali oleh consumer (idempotency via `inbox_events.event_id` UNIQUE). | High     | ✅ Implemented      |
| NFR-08-09 | Data yang dihapus secara logis (soft delete) harus menggunakan field `status` bukan `DELETE` fisik pada tabel utama.      | Medium   | ✅ Implemented      |
| NFR-08-10 | **[Produksi]** Implementasi backup database otomatis dengan retensi minimal 7 hari.                                       | High     | 🔲 Planned          |
| NFR-08-11 | **[Produksi]** Implementasi enkripsi data sensitif at-rest untuk kolom password dan token.                                | High     | ✅ Partial (bcrypt) |

---

## 5. Batasan Sistem

| No  | Batasan                                                                                     |
| --- | ------------------------------------------------------------------------------------------- |
| 1   | Sistem bukan SIAKAD penuh — tidak mengelola KRS, KHS, pembayaran, presensi, atau kurikulum. |
| 2   | Deployment MVP dirancang untuk lokal/development menggunakan Docker Compose.                |
| 3   | Token disimpan di localStorage (MVP); produksi harus menggunakan httpOnly secure cookie.    |
| 4   | File storage menggunakan local filesystem (MVP); produksi harus menggunakan object storage. |
| 5   | Komunikasi gRPC antar service tanpa TLS (MVP); produksi harus menggunakan mTLS.             |
| 6   | Redis belum diimplementasikan; rate limiting dan token blacklist belum tersedia.            |
| 7   | Tidak ada email notification; semua notifikasi bersifat in-app.                             |
| 8   | Tidak ada fitur pencarian atau pagination pada daftar pengajuan (MVP).                      |
| 9   | Tidak ada fitur multi-tenancy; sistem dirancang untuk satu institusi.                       |
| 10  | Supervisor request hanya mendukung satu dosen pembimbing per mahasiswa per pengajuan.       |

---

## 6. Asumsi

| No  | Asumsi                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------- |
| 1   | Setiap user hanya memiliki satu role aktif.                                                             |
| 2   | Data master (dosen, departemen, layanan akademik) diisi melalui migration/seed, bukan melalui UI admin. |
| 3   | Mahasiswa sudah terdaftar di sistem sebelum dapat membuat pengajuan.                                    |
| 4   | RabbitMQ dan PostgreSQL tersedia dan berjalan sebelum service Go dijalankan.                            |
| 5   | Folder `storage/uploads/` sudah ada atau dapat dibuat oleh proses file-service.                         |
| 6   | Semua service berjalan di mesin yang sama (localhost) untuk deployment lokal.                           |
| 7   | Browser yang digunakan mendukung Fetch API dan Blob URL (modern browser).                               |

---

## 7. Traceability Matrix

### FR → Komponen Implementasi

| FR ID | Service                            | File Utama                                                                 |
| ----- | ---------------------------------- | -------------------------------------------------------------------------- |
| FR-01 | auth-service, api-gateway          | `auth_handler.go`, `auth-api.ts`                                           |
| FR-02 | api-gateway, web                   | `auth_middleware.go`, `protected-page.tsx`                                 |
| FR-03 | academic-service, api-gateway, web | `grpc_academic_handler.go`, `academic_handler.go`, `academic-api.ts`       |
| FR-04 | academic-service, api-gateway, web | `grpc_supervisor_handler.go`, `supervisor_handler.go`, `supervisor-api.ts` |
| FR-05 | file-service, api-gateway, web     | `file_handler.go`, `file-api.ts`, `file-section.tsx`                       |
| FR-06 | notification-service, web          | `notification_handler.go`, `notification-api.ts`                           |
| FR-07 | reporting-service, web             | `reporting_handler.go`, `reporting-api.ts`                                 |
| FR-08 | academic-service, file-service     | `academic_repository.go`, `file_handler.go`                                |

### Status Legend

| Simbol             | Keterangan                                               |
| ------------------ | -------------------------------------------------------- |
| ✅ Implemented     | Sudah diimplementasi dan berjalan                        |
| ⚠️ MVP Only        | Diimplementasi untuk MVP, perlu diperkuat untuk produksi |
| 🔲 Planned         | Direncanakan untuk fase lanjutan                         |
| ❌ Not Implemented | Belum diimplementasi                                     |

---

_Dokumen ini diperbarui sesuai dengan perkembangan implementasi. Setiap perubahan arsitektur atau fitur baru harus direfleksikan di dokumen ini._
