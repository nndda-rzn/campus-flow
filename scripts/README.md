# scripts/

Operasi orchestrator untuk CampusFlow lokal. Semuanya idempotent dan menerima override lewat env var.

## Prasyarat

- Docker Desktop berjalan: `docker compose up -d` di repo root menyalakan Postgres + RabbitMQ.
- Go 1.25+ on PATH, Node 20+ on PATH untuk frontend.
- `migrate` CLI:
  ```bash
  go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
  ```
- `protoc` + `protoc-gen-go` + `protoc-gen-go-grpc` hanya kalau menyentuh proto.

## Daftar Script

| Script              | OS         | Fungsi                                                        |
| ------------------- | ---------- | ------------------------------------------------------------- |
| `gen-proto.ps1`     | Windows    | Regenerate Go binding dari `proto/`                            |
| `migrate-all.ps1`   | Windows    | Apply semua migrasi (atau `-Down` untuk rollback satu langkah) |
| `migrate-all.sh`    | Linux/macOS| Sama seperti di atas (`up` default, `down` untuk rollback)     |
| `run-all.ps1`       | Windows    | Spawn 6 service + frontend di window pwsh terpisah             |
| `run-all.sh`        | Linux/macOS| Run paralel di satu shell, log ber-prefix per service          |
| `stop-all.ps1`      | Windows    | Kill proses CampusFlow yang masih nyala                        |
| `stop-all.sh`       | Linux/macOS| Sama, port-based                                                |

## Quick Start (Windows)

```powershell
# 1. Infra
docker compose up -d

# 2. Migrasi semua DB
.\scripts\migrate-all.ps1

# 3. Jalankan semua service + frontend
.\scripts\run-all.ps1
```

Health check:

```powershell
curl http://localhost:8080/health
```

Stop:

```powershell
.\scripts\stop-all.ps1
```

## Quick Start (Linux / macOS)

```bash
docker compose up -d
chmod +x scripts/*.sh
./scripts/migrate-all.sh
./scripts/run-all.sh
```

Stop dengan `Ctrl+C` (run-all.sh) atau `./scripts/stop-all.sh` jika service dijalankan terpisah.

## Override Database / Broker

Migrasi mengikuti env var ini (default mengikuti `docker-compose.yml`):

| Env          | Default                |
| ------------ | ---------------------- |
| `DB_USER`    | `campusflow`           |
| `DB_PASSWORD`| `campusflow_password`  |
| `DB_HOST`    | `localhost`            |
| `DB_PORT`    | `5432`                 |
| `DB_SSLMODE` | `disable`              |

Service membaca `DATABASE_URL` dan `RABBITMQ_URL` masing-masing dengan fallback yang sama. Override per service dengan set env sebelum spawn.

## Catatan

- `run-all.ps1` membuka window terpisah karena PowerShell on Windows kurang nyaman untuk multiplex log warna; kalau prefer single-window, pakai `run-all.sh` lewat WSL.
- Outbox publisher di academic / auth / file service akan log warning kalau RabbitMQ tidak available, lalu tetap melayani gRPC. Pastikan RabbitMQ running supaya event delivery jalan end-to-end.
- Untuk regenerasi proto setelah edit `.proto`: `.\scripts\gen-proto.ps1`. Generated `.pb.go` files gitignored — pasti regen di tiap clone.
