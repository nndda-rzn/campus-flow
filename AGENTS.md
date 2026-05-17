# CampusFlow Agent Instructions

CampusFlow is a full-stack campus management system built as a monorepo with Go microservices, Next.js frontend, PostgreSQL, RabbitMQ, gRPC, Protocol Buffers, Docker, and service-specific database migrations.

These instructions are mandatory for all AI agents working in this repository.

---

## 1. Primary Goal

Help develop, debug, refactor, and document CampusFlow with minimal unnecessary context loading.

The agent must prioritize:

1. Correctness
2. Minimal file access
3. Low token usage
4. Safe edits
5. Clear reasoning before broad changes
6. Service boundaries
7. Existing project conventions

Do not scan the entire repository unless explicitly requested.

---

## 2. Token and Context Policy

This repository is large. Avoid loading excessive files.

### Required behavior

- Read only files directly related to the current task.
- Prefer targeted inspection over broad repository scanning.
- Before reading many files, explain which files are needed and why.
- Do not read generated files unless the task is specifically about generated code.
- Do not read binary files, uploads, logs, datasets, build outputs, dependency folders, or cache folders.
- Avoid repeatedly reading the same files if their content is already known in the current session.
- Summarize findings before making large edits.
- Ask for confirmation before cross-service refactors.

### Avoid these unless explicitly requested

- Full repository analysis
- Full architecture review
- Full security audit
- Full dependency audit
- Reading all services at once
- Reading all database migrations at once
- Reading all frontend routes at once
- Reading generated protobuf files
- Reading uploaded files or local storage files

---