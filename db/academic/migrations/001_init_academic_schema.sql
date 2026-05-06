-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    nim TEXT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department_id UUID NULL REFERENCES departments(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE lecturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL UNIQUE,
    nidn TEXT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department_id UUID NULL REFERENCES departments(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    max_supervisor_quota INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE academic_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT NOT NULL UNIQUE,
    student_user_id UUID NOT NULL,
    academic_service_id UUID NOT NULL REFERENCES academic_services(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT service_requests_status_check CHECK (
        status IN (
            'DRAFT',
            'SUBMITTED',
            'VERIFIED',
            'APPROVED',
            'REJECTED',
            'REVISION_REQUIRED',
            'COMPLETED',
            'CANCELLED'
        )
    )
);

CREATE TABLE request_status_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    old_status TEXT NULL,
    new_status TEXT NOT NULL,
    actor_user_id UUID NULL,
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE request_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    approver_user_id UUID NOT NULL,
    approver_role TEXT NOT NULL,
    action TEXT NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP NULL
);

INSERT INTO departments (code, name) VALUES
('IF', 'Informatika'),
('SI', 'Sistem Informasi'),
('TI', 'Teknologi Informasi')
ON CONFLICT (code) DO NOTHING;

INSERT INTO academic_services (code, name, description) VALUES
('SURAT_AKTIF_KULIAH', 'Surat Aktif Kuliah', 'Pengajuan surat keterangan aktif kuliah.'),
('SURAT_MAGANG', 'Surat Magang', 'Pengajuan surat pengantar magang.'),
('IZIN_PENELITIAN', 'Izin Penelitian', 'Pengajuan surat izin penelitian.'),
('SURAT_REKOMENDASI', 'Surat Rekomendasi', 'Pengajuan surat rekomendasi akademik.')
ON CONFLICT (code) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS request_approvals;
DROP TABLE IF EXISTS request_status_histories;
DROP TABLE IF EXISTS service_requests;
DROP TABLE IF EXISTS academic_services;
DROP TABLE IF EXISTS lecturers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS departments;