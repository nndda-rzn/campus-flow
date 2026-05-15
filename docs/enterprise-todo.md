# CampusFlow — Enterprise Gap Analysis & Implementation Backlog

**Versi:** 1.0  
**Tanggal:** Mei 2026  
**Tujuan:** Daftar FR dan NFR yang **belum diimplementasi** dan harus dikerjakan agar sistem mencapai kualitas enterprise.  
**Referensi:** `docs/requirements.md` (kondisi saat ini)

> **Cara membaca dokumen ini:**  
> Setiap item memiliki prioritas **[P1] Critical**, **[P2] High**, **[P3] Medium**, **[P4] Low**.  
> Item bertanda ✅ sudah selesai dikerjakan. Item bertanda 🔲 belum dikerjakan.

---

## Daftar Isi

1. [FR Gap — Frontend / UI](#1-fr-gap--frontend--ui)
2. [FR Gap — Backend / API](#2-fr-gap--backend--api)
3. [FR Gap — Fitur Bisnis yang Belum Ada](#3-fr-gap--fitur-bisnis-yang-belum-ada)
4. [NFR Gap — Security](#4-nfr-gap--security)
5. [NFR Gap — Reliability & Observability](#5-nfr-gap--reliability--observability)
6. [NFR Gap — Performance & Scalability](#6-nfr-gap--performance--scalability)
7. [NFR Gap — Maintainability & DevOps](#7-nfr-gap--maintainability--devops)
8. [Urutan Pengerjaan yang Disarankan](#8-urutan-pengerjaan-yang-disarankan)

---

## 1. FR Gap — Frontend / UI

### 1.1 Halaman Admin Prodi — Academic Request

Kondisi saat ini: **tidak ada halaman verifikasi academic request untuk Admin Prodi**. Admin hanya bisa verifikasi supervisor request via form UUID manual.

| ID       | Requirement                                                                                                         | Priority      | Status |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| FE-01-01 | Halaman `/admin/academic-requests` harus menampilkan daftar semua pengajuan akademik dengan filter status.          | [P1] Critical | 🔲     |
| FE-01-02 | Setiap item pengajuan harus dapat di-expand untuk melihat detail: judul, deskripsi, nomor pengajuan, tanggal, file. | [P1] Critical | 🔲     |
| FE-01-03 | Admin Prodi harus dapat memverifikasi pengajuan langsung dari daftar (bukan input UUID manual).                     | [P1] Critical | 🔲     |
| FE-01-04 | Form verifikasi harus menyertakan field catatan (note) yang opsional.                                               | [P2] High     | 🔲     |
| FE-01-05 | Setelah verifikasi berhasil, item harus diperbarui secara otomatis tanpa full page reload.                          | [P2] High     | 🔲     |
| FE-01-06 | Dashboard Admin Prodi harus menampilkan link ke halaman verifikasi academic request.                                | [P2] High     | 🔲     |

### 1.2 Halaman Kaprodi — Academic Request

Kondisi saat ini: **tidak ada halaman approve/reject academic request untuk Kaprodi**. Kaprodi hanya bisa assign supervisor via form UUID manual.

| ID       | Requirement                                                                                                                | Priority      | Status |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| FE-02-01 | Halaman `/head/academic-requests` harus menampilkan daftar pengajuan berstatus `VERIFIED` yang menunggu keputusan Kaprodi. | [P1] Critical | 🔲     |
| FE-02-02 | Kaprodi harus dapat menyetujui (approve) pengajuan langsung dari daftar.                                                   | [P1] Critical | 🔲     |
| FE-02-03 | Kaprodi harus dapat menolak (reject) pengajuan dengan wajib mengisi catatan alasan penolakan.                              | [P1] Critical | 🔲     |
| FE-02-04 | Sebelum approve/reject, sistem harus menampilkan dialog konfirmasi.                                                        | [P2] High     | 🔲     |
| FE-02-05 | Dashboard Kaprodi harus menampilkan link ke halaman academic request dan supervisor request.                               | [P2] High     | 🔲     |

### 1.3 Halaman Admin Prodi — Supervisor Request (Perbaikan)

Kondisi saat ini: form input UUID manual — tidak layak untuk production.

| ID       | Requirement                                                                                                | Priority      | Status |
| -------- | ---------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| FE-03-01 | Halaman `/admin/supervisor-requests` harus menampilkan daftar pengajuan pembimbing berstatus `SUBMITTED`.  | [P1] Critical | 🔲     |
| FE-03-02 | Admin Prodi harus dapat memverifikasi langsung dari daftar, bukan input UUID manual.                       | [P1] Critical | 🔲     |
| FE-03-03 | Detail pengajuan harus menampilkan: topik, deskripsi, pilihan dosen (dengan prioritas), tanggal pengajuan. | [P2] High     | 🔲     |

### 1.4 Halaman Kaprodi — Supervisor Request (Perbaikan)

Kondisi saat ini: form input UUID manual — tidak layak untuk production.

| ID       | Requirement                                                                                             | Priority      | Status |
| -------- | ------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| FE-04-01 | Halaman `/head/supervisor-requests` harus menampilkan daftar pengajuan pembimbing berstatus `VERIFIED`. | [P1] Critical | 🔲     |
| FE-04-02 | Kaprodi harus dapat menetapkan dosen langsung dari daftar dengan memilih dosen dari dropdown.           | [P1] Critical | 🔲     |
| FE-04-03 | Daftar pilihan dosen harus menampilkan nama, NIDN, dan sisa kuota pembimbing.                           | [P2] High     | 🔲     |
| FE-04-04 | Pilihan dosen yang diajukan mahasiswa harus ditampilkan sebagai rekomendasi (highlight).                | [P3] Medium   | 🔲     |

### 1.5 Halaman Dosen — Supervisor Request (Perbaikan)

| ID       | Requirement                                                                                                           | Priority      | Status |
| -------- | --------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| FE-05-01 | Halaman `/lecturer/supervisor-requests` harus menampilkan detail lengkap pengajuan: topik, deskripsi, nama mahasiswa. | [P2] High     | 🔲     |
| FE-05-02 | Dosen harus dapat accept/reject langsung dari daftar, bukan input UUID manual.                                        | [P1] Critical | 🔲     |
| FE-05-03 | Form reject harus mewajibkan pengisian catatan alasan.                                                                | [P2] High     | 🔲     |

### 1.6 Pagination & Search

Kondisi saat ini: **tidak ada pagination** di mana pun — berbahaya saat data besar.

| ID       | Requirement                                                                                                            | Priority    | Status |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| FE-06-01 | Semua halaman daftar pengajuan harus mendukung pagination (minimal client-side untuk MVP, server-side untuk produksi). | [P2] High   | 🔲     |
| FE-06-02 | Halaman daftar untuk role internal harus mendukung filter berdasarkan status.                                          | [P2] High   | 🔲     |
| FE-06-03 | Halaman daftar untuk role internal harus mendukung pencarian berdasarkan nomor pengajuan atau judul.                   | [P3] Medium | 🔲     |
| FE-06-04 | Backend endpoint list harus mendukung parameter `page`, `limit`, dan `search` untuk server-side pagination.            | [P2] High   | 🔲     |

### 1.7 Halaman Detail Pengajuan

| ID       | Requirement                                                                                                             | Priority    | Status |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| FE-07-01 | Harus ada halaman detail pengajuan akademik (`/academic-requests/{id}`) yang dapat diakses oleh semua role yang berhak. | [P2] High   | 🔲     |
| FE-07-02 | Halaman detail harus menampilkan: informasi pengajuan, riwayat status (timeline), daftar file, dan catatan setiap aksi. | [P2] High   | 🔲     |
| FE-07-03 | Riwayat status harus ditampilkan sebagai timeline vertikal dengan tanggal, aktor, dan catatan.                          | [P3] Medium | 🔲     |

### 1.8 Error Handling & UX

| ID       | Requirement                                                                                         | Priority    | Status |
| -------- | --------------------------------------------------------------------------------------------------- | ----------- | ------ |
| FE-08-01 | Harus ada halaman 404 custom yang informatif.                                                       | [P2] High   | 🔲     |
| FE-08-02 | Harus ada Error Boundary di level layout untuk menangkap runtime error dan menampilkan fallback UI. | [P2] High   | 🔲     |
| FE-08-03 | Aksi destruktif (reject, cancel) harus menampilkan dialog konfirmasi sebelum dieksekusi.            | [P2] High   | 🔲     |
| FE-08-04 | Semua form harus memiliki validasi client-side sebelum request dikirim ke API.                      | [P2] High   | 🔲     |
| FE-08-05 | Pesan error dari API harus ditampilkan dalam Bahasa Indonesia yang mudah dipahami user.             | [P3] Medium | 🔲     |
| FE-08-06 | Halaman yang sedang loading data harus menampilkan skeleton loader, bukan teks "Memuat..." saja.    | [P3] Medium | 🔲     |

### 1.9 Notifikasi — Halaman Lengkap

| ID       | Requirement                                                                                            | Priority    | Status |
| -------- | ------------------------------------------------------------------------------------------------------ | ----------- | ------ |
| FE-09-01 | Halaman `/notifications` harus menampilkan daftar notifikasi dengan filter "Semua" dan "Belum Dibaca". | [P2] High   | 🔲     |
| FE-09-02 | Setiap notifikasi harus dapat diklik untuk navigasi ke entitas terkait (pengajuan yang dimaksud).      | [P3] Medium | 🔲     |
| FE-09-03 | Harus ada tombol "Tandai Semua Dibaca" di halaman notifikasi.                                          | [P3] Medium | 🔲     |

---

## 2. FR Gap — Backend / API

### 2.1 Pagination & Filtering di Backend

| ID       | Requirement                                                                                               | Priority      | Status |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| BE-01-01 | Endpoint `GET /api/v1/admin/academic-requests` harus mendukung query param: `status`, `page`, `limit`.    | [P2] High     | 🔲     |
| BE-01-02 | Response list endpoint harus menyertakan metadata pagination: `total`, `page`, `limit`, `total_pages`.    | [P2] High     | 🔲     |
| BE-01-03 | Endpoint list supervisor request untuk admin/kaprodi harus tersedia dan mendukung filter status.          | [P1] Critical | 🔲     |
| BE-01-04 | Proto `ListAllAcademicRequests` dan `ListAllSupervisorRequests` harus mendukung field `page` dan `limit`. | [P2] High     | 🔲     |

### 2.2 Endpoint yang Belum Ada

| ID       | Requirement                                                                                                      | Priority      | Status |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| BE-02-01 | `GET /api/v1/admin/supervisor-requests` — list semua supervisor request untuk Admin Prodi/Kaprodi.               | [P1] Critical | 🔲     |
| BE-02-02 | `GET /api/v1/academic-requests/{id}/history` — riwayat status lengkap satu pengajuan.                            | [P2] High     | 🔲     |
| BE-02-03 | `POST /api/v1/notifications/read-all` — tandai semua notifikasi sebagai dibaca.                                  | [P3] Medium   | 🔲     |
| BE-02-04 | `GET /api/v1/academic-requests/{id}` — detail satu pengajuan akademik (sudah ada di gRPC, perlu expose ke REST). | [P2] High     | 🔲     |

### 2.3 Validasi Input yang Lebih Ketat

| ID       | Requirement                                                                                             | Priority    | Status |
| -------- | ------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| BE-03-01 | Endpoint registrasi harus memvalidasi format email menggunakan regex standar.                           | [P2] High   | 🔲     |
| BE-03-02 | Endpoint registrasi harus memvalidasi panjang password minimal 8 karakter.                              | [P2] High   | 🔲     |
| BE-03-03 | Endpoint registrasi harus memvalidasi bahwa `role` yang dikirim adalah salah satu dari role yang valid. | [P2] High   | 🔲     |
| BE-03-04 | Field `title` pada academic request harus dibatasi maksimal 255 karakter.                               | [P3] Medium | 🔲     |
| BE-03-05 | Field `topic_title` pada supervisor request harus dibatasi maksimal 255 karakter.                       | [P3] Medium | 🔲     |

---

## 3. FR Gap — Fitur Bisnis yang Belum Ada

### 3.1 Manajemen Data Master (Admin)

| ID        | Requirement                                                                                      | Priority  | Status |
| --------- | ------------------------------------------------------------------------------------------------ | --------- | ------ |
| BIZ-01-01 | Super Admin harus dapat menambah, mengubah, dan menonaktifkan jenis layanan akademik melalui UI. | [P2] High | 🔲     |
| BIZ-01-02 | Super Admin harus dapat menambah dan mengelola data dosen melalui UI.                            | [P2] High | 🔲     |
| BIZ-01-03 | Super Admin harus dapat melihat daftar semua user dan mengubah status akun (aktif/nonaktif).     | [P2] High | 🔲     |

### 3.2 Pembatalan Pengajuan

| ID        | Requirement                                                                              | Priority  | Status |
| --------- | ---------------------------------------------------------------------------------------- | --------- | ------ |
| BIZ-02-01 | Mahasiswa harus dapat membatalkan pengajuan akademik yang masih berstatus `SUBMITTED`.   | [P2] High | 🔲     |
| BIZ-02-02 | Mahasiswa harus dapat membatalkan pengajuan pembimbing yang masih berstatus `SUBMITTED`. | [P2] High | 🔲     |
| BIZ-02-03 | Pembatalan harus mencatat riwayat status dan audit log.                                  | [P2] High | 🔲     |

### 3.3 Revisi Pengajuan

| ID        | Requirement                                                                                               | Priority    | Status |
| --------- | --------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| BIZ-03-01 | Admin Prodi harus dapat meminta revisi pengajuan (`SUBMITTED` → `REVISION_REQUIRED`).                     | [P3] Medium | 🔲     |
| BIZ-03-02 | Mahasiswa harus dapat melihat catatan revisi dan mengupdate pengajuan yang berstatus `REVISION_REQUIRED`. | [P3] Medium | 🔲     |
| BIZ-03-03 | Setelah diupdate, status kembali ke `SUBMITTED` untuk diverifikasi ulang.                                 | [P3] Medium | 🔲     |

### 3.4 Profil User

| ID        | Requirement                                                          | Priority    | Status |
| --------- | -------------------------------------------------------------------- | ----------- | ------ |
| BIZ-04-01 | User harus dapat melihat profil dirinya sendiri (nama, email, role). | [P3] Medium | 🔲     |
| BIZ-04-02 | User harus dapat mengubah password dengan verifikasi password lama.  | [P3] Medium | 🔲     |

---

## 4. NFR Gap — Security

| ID     | Requirement                                                                                                                                                                                                       | Priority      | Status |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| SEC-01 | **Rate Limiting** — API Gateway harus membatasi jumlah request per IP per menit untuk mencegah brute force dan DDoS. Target: max 100 req/menit untuk endpoint publik, 300 req/menit untuk endpoint authenticated. | [P1] Critical | 🔲     |
| SEC-02 | **Token Blacklist** — Refresh token yang sudah di-revoke harus dicek via Redis (bukan hanya DB query) untuk performa.                                                                                             | [P2] High     | 🔲     |
| SEC-03 | **MIME Type Validation** — Validasi file upload harus memeriksa magic bytes (file signature), bukan hanya ekstensi.                                                                                               | [P2] High     | 🔲     |
| SEC-04 | **Input Sanitization** — Semua input teks dari user harus di-trim dan di-sanitize sebelum disimpan ke database.                                                                                                   | [P2] High     | 🔲     |
| SEC-05 | **SQL Injection Prevention** — Semua query database harus menggunakan parameterized query (sudah sebagian, perlu audit menyeluruh).                                                                               | [P1] Critical | 🔲     |
| SEC-06 | **Secure Headers** — API Gateway harus mengembalikan security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.                                                                            | [P2] High     | 🔲     |
| SEC-07 | **Session Timeout** — Access token harus memiliki expiry yang dikonfigurasi (disarankan 15 menit untuk produksi).                                                                                                 | [P2] High     | 🔲     |
| SEC-08 | **Audit Trail untuk Auth** — Login berhasil, login gagal, dan logout harus dicatat di audit log dengan IP address dan user agent.                                                                                 | [P2] High     | 🔲     |
| SEC-09 | **[Produksi] httpOnly Cookie** — Token harus dipindahkan dari localStorage ke httpOnly secure cookie untuk mencegah XSS.                                                                                          | [P1] Critical | 🔲     |
| SEC-10 | **[Produksi] mTLS** — Komunikasi gRPC antar service harus menggunakan mutual TLS.                                                                                                                                 | [P2] High     | 🔲     |
| SEC-11 | **[Produksi] HTTPS** — Semua traffic harus melalui HTTPS dengan TLS 1.2+.                                                                                                                                         | [P1] Critical | 🔲     |

---

## 5. NFR Gap — Reliability & Observability

| ID     | Requirement                                                                                                                                 | Priority    | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| REL-01 | **Retry dengan Exponential Backoff** — Outbox publisher harus retry dengan backoff saat RabbitMQ tidak tersedia, bukan hanya log warning.   | [P2] High   | 🔲     |
| REL-02 | **Dead Letter Queue (DLQ)** — Event yang gagal diproses consumer setelah N retry harus masuk ke DLQ untuk investigasi manual.               | [P2] High   | 🔲     |
| REL-03 | **Health Check per Service** — Setiap microservice harus memiliki endpoint `/health` yang mengecek koneksi DB dan RabbitMQ.                 | [P2] High   | 🔲     |
| REL-04 | **Graceful Shutdown** — Setiap service harus menangani signal SIGTERM untuk menyelesaikan request yang sedang berjalan sebelum shutdown.    | [P2] High   | 🔲     |
| REL-05 | **Structured Logging** — Semua log harus dalam format JSON dengan field: `timestamp`, `level`, `service`, `message`, `request_id`, `error`. | [P2] High   | 🔲     |
| REL-06 | **Request ID Propagation** — Setiap request harus memiliki `X-Request-ID` yang diteruskan ke semua service untuk tracing.                   | [P2] High   | 🔲     |
| REL-07 | **Metrics Endpoint** — Setiap service harus mengekspos metrics Prometheus di `/metrics`: request count, latency histogram, error rate.      | [P3] Medium | 🔲     |
| REL-08 | **Distributed Tracing** — Integrasi OpenTelemetry untuk tracing request lintas service.                                                     | [P3] Medium | 🔲     |
| REL-09 | **Alert** — Sistem harus mengirimkan alert (email/Slack) saat error rate > 5% atau service down.                                            | [P3] Medium | 🔲     |

---

## 6. NFR Gap — Performance & Scalability

| ID      | Requirement                                                                                                                                                    | Priority    | Status |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| PERF-01 | **Server-side Pagination** — Semua endpoint list harus mendukung pagination di level database (LIMIT/OFFSET atau cursor-based) untuk mencegah full table scan. | [P2] High   | 🔲     |
| PERF-02 | **Database Index Audit** — Audit semua query yang sering dijalankan dan pastikan index yang tepat sudah ada.                                                   | [P2] High   | 🔲     |
| PERF-03 | **Connection Pool Tuning** — Konfigurasi `pgxpool` dengan `MaxConns`, `MinConns`, `MaxConnLifetime` yang sesuai beban.                                         | [P2] High   | 🔲     |
| PERF-04 | **Response Caching** — Endpoint yang jarang berubah (list academic services, list lecturers) harus di-cache di Redis dengan TTL yang sesuai.                   | [P3] Medium | 🔲     |
| PERF-05 | **[Produksi] Object Storage** — File storage harus dipindahkan ke MinIO atau S3-compatible untuk mendukung multi-instance dan CDN.                             | [P2] High   | 🔲     |
| PERF-06 | **[Produksi] Load Balancer** — API Gateway harus dapat di-deploy multiple instance di belakang load balancer.                                                  | [P3] Medium | 🔲     |

---

## 7. NFR Gap — Maintainability & DevOps

| ID     | Requirement                                                                                                                                               | Priority      | Status |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| DEV-01 | **Unit Test — Service Layer** — Setiap fungsi di layer service harus memiliki unit test dengan mock repository. Target coverage ≥ 70%.                    | [P2] High     | 🔲     |
| DEV-02 | **Integration Test** — Setiap endpoint API Gateway harus memiliki integration test yang menguji happy path dan error path.                                | [P2] High     | 🔲     |
| DEV-03 | **Frontend Component Test** — Komponen UI kritis (ProtectedPage, FileSection, form pengajuan) harus memiliki test.                                        | [P3] Medium   | 🔲     |
| DEV-04 | **Environment Configuration** — Semua konfigurasi sensitif (DB URL, JWT secret, RabbitMQ URL) harus dibaca dari environment variable, tidak ada hardcode. | [P1] Critical | 🔲     |
| DEV-05 | **Docker Compose untuk Development** — Semua service harus dapat dijalankan dengan satu perintah `docker compose up`.                                     | [P2] High     | 🔲     |
| DEV-06 | **Makefile / Script** — Harus ada script untuk: start semua service, run migration, generate proto, run test.                                             | [P3] Medium   | 🔲     |
| DEV-07 | **CI/CD Pipeline** — GitHub Actions untuk: lint, test, build, dan generate proto pada setiap push ke main.                                                | [P3] Medium   | 🔲     |
| DEV-08 | **API Documentation** — Semua endpoint REST harus terdokumentasi (OpenAPI/Swagger atau Postman collection).                                               | [P2] High     | 🔲     |
| DEV-09 | **Database Backup Script** — Harus ada script untuk backup dan restore semua database.                                                                    | [P3] Medium   | 🔲     |
| DEV-10 | **Dependency Pinning** — Semua dependency Go dan npm harus menggunakan versi yang di-pin (sudah sebagian, perlu audit).                                   | [P2] High     | 🔲     |

---

## 8. Urutan Pengerjaan yang Disarankan

Berdasarkan dampak terhadap fungsionalitas dan risiko, berikut urutan yang disarankan:

### Sprint 1 — Core UI Completion (Paling Mendesak)

> Sistem tidak bisa digunakan secara nyata tanpa ini.

1. 🔲 **FE-01** — Halaman Admin Prodi: list + verifikasi academic request
2. 🔲 **FE-02** — Halaman Kaprodi: list + approve/reject academic request
3. 🔲 **FE-03** — Halaman Admin Prodi: list + verifikasi supervisor request (ganti form UUID)
4. 🔲 **FE-04** — Halaman Kaprodi: list + assign supervisor (ganti form UUID)
5. 🔲 **FE-05** — Halaman Dosen: list + accept/reject (ganti form UUID)
6. 🔲 **BE-02-01** — Endpoint list semua supervisor request

### Sprint 2 — UX & Data Integrity

> Membuat sistem layak dipakai user nyata.

7. 🔲 **FE-08** — Error handling: 404, error boundary, konfirmasi dialog, validasi form
8. 🔲 **FE-07** — Halaman detail pengajuan dengan timeline riwayat status
9. 🔲 **BIZ-02** — Fitur pembatalan pengajuan oleh mahasiswa
10. 🔲 **BE-01** — Pagination di backend dan frontend
11. 🔲 **BE-03** — Validasi input yang lebih ketat di backend

### Sprint 3 — Security Hardening

> Wajib sebelum deploy ke environment yang diakses orang lain.

12. 🔲 **SEC-01** — Rate limiting di API Gateway
13. 🔲 **SEC-06** — Security headers
14. 🔲 **SEC-08** — Audit trail untuk auth events
15. 🔲 **DEV-04** — Audit environment variable (tidak ada hardcode)
16. 🔲 **SEC-07** — Konfigurasi token expiry yang proper

### Sprint 4 — Reliability & Observability

> Membuat sistem dapat di-monitor dan di-debug.

17. 🔲 **REL-05** — Structured logging (JSON format)
18. 🔲 **REL-06** — Request ID propagation
19. 🔲 **REL-01** — Retry dengan exponential backoff di outbox publisher
20. 🔲 **REL-03** — Health check per service
21. 🔲 **REL-04** — Graceful shutdown

### Sprint 5 — Testing & Documentation

> Membuat sistem maintainable jangka panjang.

22. 🔲 **DEV-01** — Unit test service layer
23. 🔲 **DEV-02** — Integration test API
24. 🔲 **DEV-08** — API documentation (OpenAPI)
25. 🔲 **DEV-05** — Docker Compose untuk semua service

### Sprint 6 — Advanced Features & Production Readiness

> Untuk deployment produksi.

26. 🔲 **BIZ-01** — Manajemen data master via UI
27. 🔲 **PERF-01** — Server-side pagination
28. 🔲 **SEC-09** — httpOnly cookie
29. 🔲 **PERF-05** — Object storage (MinIO)
30. 🔲 **SEC-11** — HTTPS + Nginx

---

## Ringkasan Gap

| Kategori      | Total Item | P1 Critical | P2 High | P3 Medium | P4 Low |
| ------------- | ---------- | ----------- | ------- | --------- | ------ |
| Frontend / UI | 35         | 10          | 16      | 9         | 0      |
| Backend / API | 12         | 3           | 7       | 2         | 0      |
| Fitur Bisnis  | 11         | 0           | 7       | 4         | 0      |
| Security      | 11         | 4           | 6       | 1         | 0      |
| Reliability   | 9          | 0           | 5       | 4         | 0      |
| Performance   | 6          | 0           | 3       | 3         | 0      |
| DevOps        | 10         | 1           | 5       | 4         | 0      |
| **Total**     | **94**     | **18**      | **49**  | **27**    | **0**  |

> **18 item P1 Critical** harus diselesaikan sebelum sistem dianggap layak enterprise.  
> **49 item P2 High** harus diselesaikan sebelum go-live ke production.

---

_Update dokumen ini setiap kali item selesai dikerjakan dengan mengubah 🔲 menjadi ✅ dan menambahkan tanggal penyelesaian._
