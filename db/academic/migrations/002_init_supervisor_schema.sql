-- +goose Up
CREATE TABLE supervisor_requests (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     request_number TEXT NOT NULL UNIQUE,
                                     student_user_id UUID NOT NULL,
                                     topic_title TEXT NOT NULL,
                                     topic_description TEXT NOT NULL DEFAULT '',
                                     status TEXT NOT NULL DEFAULT 'SUBMITTED',
                                     verified_at TIMESTAMP NULL,
                                     assigned_at TIMESTAMP NULL,
                                     accepted_at TIMESTAMP NULL,
                                     rejected_at TIMESTAMP NULL,
                                     completed_at TIMESTAMP NULL,
                                     created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                     updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                     CONSTRAINT supervisor_requests_status_check CHECK (
                                         status IN (
                                                    'DRAFT',
                                                    'SUBMITTED',
                                                    'VERIFIED',
                                                    'REVISION_REQUIRED',
                                                    'ASSIGNED',
                                                    'ACCEPTED',
                                                    'REJECTED',
                                                    'COMPLETED',
                                                    'CANCELLED'
                                             )
                                         )
);

CREATE TABLE supervisor_request_choices (
                                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                            request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
                                            lecturer_id UUID NOT NULL REFERENCES lecturers(id),
                                            priority INT NOT NULL,
                                            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                            UNIQUE (request_id, lecturer_id),
                                            UNIQUE (request_id, priority)
);

CREATE TABLE supervisor_assignments (
                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                        request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
                                        lecturer_id UUID NOT NULL REFERENCES lecturers(id),
                                        assigned_by_user_id UUID NOT NULL,
                                        status TEXT NOT NULL DEFAULT 'PENDING',
                                        note TEXT NULL,
                                        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                        CONSTRAINT supervisor_assignments_status_check CHECK (
                                            status IN ('PENDING', 'ACCEPTED', 'REJECTED')
                                            )
);

CREATE TABLE lecturer_supervisor_quotas (
                                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                            lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
                                            max_quota INT NOT NULL DEFAULT 10,
                                            current_quota INT NOT NULL DEFAULT 0,
                                            academic_year TEXT NULL,
                                            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                            UNIQUE (lecturer_id, academic_year)
);

CREATE TABLE supervisor_status_histories (
                                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                             request_id UUID NOT NULL REFERENCES supervisor_requests(id) ON DELETE CASCADE,
                                             old_status TEXT NULL,
                                             new_status TEXT NOT NULL,
                                             actor_user_id UUID NULL,
                                             note TEXT NULL,
                                             created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supervisor_requests_student_user_id
    ON supervisor_requests(student_user_id);

CREATE INDEX idx_supervisor_requests_status
    ON supervisor_requests(status);

CREATE INDEX idx_supervisor_assignments_lecturer_id
    ON supervisor_assignments(lecturer_id);

-- +goose Down
DROP TABLE IF EXISTS supervisor_status_histories;
DROP TABLE IF EXISTS lecturer_supervisor_quotas;
DROP TABLE IF EXISTS supervisor_assignments;
DROP TABLE IF EXISTS supervisor_request_choices;
DROP TABLE IF EXISTS supervisor_requests;