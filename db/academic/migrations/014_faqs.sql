-- +goose Up
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

-- +goose Down
DROP TABLE IF EXISTS faqs CASCADE;
DROP TABLE IF EXISTS faq_categories CASCADE;
