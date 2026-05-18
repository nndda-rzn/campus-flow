-- +goose Up
-- Thesis Final Documents: Final thesis artifacts submitted by students for lecturer review
-- Linked to supervisor_requests (thesis context), NOT service_requests (generic academic services)

CREATE TABLE thesis_final_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL,
    lecturer_user_id UUID NOT NULL,
    
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_id UUID NOT NULL,
    filename TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    
    lecturer_notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_tfd_document_type 
        CHECK (document_type IN ('PROPOSAL', 'DRAFT', 'FINAL', 'REVISED_FINAL')),
    CONSTRAINT chk_tfd_status 
        CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED'))
);

CREATE INDEX idx_tfd_supervisor_request ON thesis_final_documents(supervisor_request_id);
CREATE INDEX idx_tfd_lecturer_status ON thesis_final_documents(lecturer_user_id, status);
CREATE INDEX idx_tfd_student ON thesis_final_documents(student_user_id);
CREATE INDEX idx_tfd_status ON thesis_final_documents(status);

COMMENT ON TABLE thesis_final_documents IS 'Final thesis documents submitted by students for lecturer (supervisor) review';
COMMENT ON COLUMN thesis_final_documents.document_type IS 'PROPOSAL | DRAFT | FINAL | REVISED_FINAL';
COMMENT ON COLUMN thesis_final_documents.status IS 'SUBMITTED | UNDER_REVIEW | APPROVED | REVISION_REQUESTED | REJECTED';
COMMENT ON COLUMN thesis_final_documents.file_id IS 'References file in file-service (file_db)';
COMMENT ON COLUMN thesis_final_documents.version IS 'Incremented when student resubmits after revision request';

-- +goose Down
DROP TABLE IF EXISTS thesis_final_documents CASCADE;
