# Rencana Implementasi Fitur Mahasiswa - CampusFlow

## Ringkasan Keputusan

| Aspek | Keputusan |
|-------|-----------|
| Logbook Approval | Dosen **wajib** approve setiap logbook |
| Milestone per Prodi | **Berbeda** untuk setiap program studi |
| Kalender Management | ADMIN_PRODI & KAPRODI (keduanya) |
| Prioritas | Mengikuti rekomendasi AI |

---

## 🎯 Urutan Prioritas Implementasi

| Prioritas | Fitur | Alasan |
|-----------|-------|--------|
| 1 | **Logbook Bimbingan** | Core feature untuk mahasiswa skripsi, high value |
| 2 | **Progress Tugas Akhir** | Terkait erat dengan logbook, satu paket |
| 3 | **FAQ & Panduan** | Quick win, mengurangi beban admin |
| 4 | **Kalender Akademik** | Quick win, informasi penting |
| 5 | **Direktori Dosen** | Extend fitur existing |
| 6 | **Enhanced Dashboard** | Polish, mengintegrasikan semua fitur baru |

---

## 📐 Database Schema Design

### Migration 010: Thesis Milestones (per Prodi)

```sql
-- 010_thesis_milestones.up.sql
CREATE TABLE thesis_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sequence_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(department_id, code)  -- Unique code per prodi
);

CREATE INDEX idx_thesis_milestones_dept ON thesis_milestones(department_id);

-- Seed default milestones untuk setiap department
INSERT INTO thesis_milestones (department_id, code, name, description, sequence_order)
SELECT d.id, m.code, m.name, m.description, m.seq
FROM departments d
CROSS JOIN (VALUES
    ('TOPIC_APPROVED', 'Judul Disetujui', 'Judul skripsi telah disetujui pembimbing', 1),
    ('PROPOSAL_SEMINAR', 'Seminar Proposal', 'Seminar proposal skripsi', 2),
    ('RESEARCH', 'Penelitian', 'Proses penelitian dan pengerjaan', 3),
    ('RESULT_SEMINAR', 'Seminar Hasil', 'Seminar hasil penelitian', 4),
    ('FINAL_EXAM', 'Sidang Akhir', 'Sidang skripsi', 5)
) AS m(code, name, description, seq);
```

### Migration 011: Thesis Progress

```sql
-- 011_thesis_progress.up.sql
CREATE TABLE thesis_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    supervisor_request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES thesis_milestones(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
    target_date DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_thesis_progress_status 
        CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    UNIQUE(student_user_id, milestone_id)
);

CREATE INDEX idx_thesis_progress_student ON thesis_progress(student_user_id);
CREATE INDEX idx_thesis_progress_request ON thesis_progress(supervisor_request_id);
```

### Migration 012: Guidance Logs

```sql
-- 012_guidance_logs.up.sql
CREATE TABLE guidance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    supervisor_request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
    lecturer_user_id UUID NOT NULL,  -- Dosen pembimbing
    
    -- Session details
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    topic VARCHAR(255) NOT NULL,
    discussion_summary TEXT NOT NULL,
    next_action TEXT,
    
    -- Approval workflow
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    supervisor_feedback TEXT,
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_guidance_log_status 
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUIRED'))
);

CREATE INDEX idx_guidance_logs_student ON guidance_logs(student_user_id);
CREATE INDEX idx_guidance_logs_lecturer ON guidance_logs(lecturer_user_id);
CREATE INDEX idx_guidance_logs_request ON guidance_logs(supervisor_request_id);
CREATE INDEX idx_guidance_logs_status ON guidance_logs(status);
```

### Migration 013: Academic Calendar

```sql
-- 013_academic_calendar.up.sql
CREATE TABLE academic_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,  -- NULL = semua prodi
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_all_day BOOLEAN NOT NULL DEFAULT TRUE,
    
    target_roles TEXT[],  -- NULL = semua role
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_calendar_event_type 
        CHECK (event_type IN ('UTS', 'UAS', 'REGISTRATION', 'HOLIDAY', 'DEADLINE', 'SEMINAR', 'OTHER'))
);

CREATE INDEX idx_calendar_dates ON academic_calendar(start_date, end_date);
CREATE INDEX idx_calendar_year ON academic_calendar(academic_year_id);
CREATE INDEX idx_calendar_dept ON academic_calendar(department_id);
```

### Migration 014: FAQ

```sql
-- 014_faqs.up.sql
CREATE TABLE faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),  -- Lucide icon name
    sequence_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sequence_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faqs_category ON faqs(category_id);

-- Seed default categories
INSERT INTO faq_categories (name, description, icon, sequence_order) VALUES
('Layanan Akademik', 'Pertanyaan seputar pengajuan surat dan dokumen', 'FileText', 1),
('Bimbingan Skripsi', 'Pertanyaan seputar proses bimbingan dan tugas akhir', 'GraduationCap', 2),
('Akun & Teknis', 'Pertanyaan seputar akun dan masalah teknis', 'Settings', 3),
('Lainnya', 'Pertanyaan umum lainnya', 'HelpCircle', 4);
```

---

## 📁 Struktur File Lengkap

### Backend - Academic Service

```
apps/services/academic-service/internal/
├── model/
│   ├── thesis_milestone.go      # NEW 
│   ├── thesis_progress.go       # NEW 
│   ├── guidance_log.go          # NEW 
│   ├── academic_calendar.go     # NEW 
│   └── faq.go                   # NEW 
├── repository/
│   ├── thesis_milestone_repo.go # NEW
│   ├── thesis_progress_repo.go  # NEW
│   ├── guidance_log_repo.go     # NEW
│   ├── academic_calendar_repo.go# NEW
│   └── faq_repo.go              # NEW
├── service/
│   ├── thesis_progress_svc.go   # NEW
│   ├── guidance_log_svc.go      # NEW
│   ├── academic_calendar_svc.go # NEW
│   └── faq_svc.go               # NEW
└── handler/
    ├── thesis_progress_handler.go   # NEW
    ├── guidance_log_handler.go      # NEW
    ├── academic_calendar_handler.go # NEW
    └── faq_handler.go               # NEW
```

---

## 📅 Timeline Implementasi

### Fase 1: Database & Models 
- Buat 5 migration files (010-014)
- Jalankan migrations
- Buat model structs di Go

### Fase 2: Backend - Core Features 
- Repository layer untuk semua entities
- Service layer dengan business logic
- Handler layer dengan HTTP endpoints
- Register routes di API Gateway

### Fase 3: Backend - Logbook & Progress 
- Logbook CRUD + approval workflow
- Thesis progress auto-creation trigger
- Lecturer endpoints untuk review logbook

### Fase 4: Frontend - Simple Pages 
- FAQ page
- Kalender Akademik page
- Direktori Dosen page (extend)
- Update navigation menu

### Fase 5: Frontend - Complex Pages 
- Logbook Bimbingan page
- Progress Tugas Akhir page
- Enhanced Dashboard

### Fase 6: Admin Pages 
- Admin: Manage Kalender
- Admin: Manage FAQ
- Admin: Manage Milestones per Prodi

### Fase 7: Testing & Polish 
- Integration testing
- UI polish & responsive
- Error handling & edge cases
