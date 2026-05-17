# syntax=docker/dockerfile:1.6
#
# Multi-stage Dockerfile for any CampusFlow Go service.
# Build with:
#   docker build -f infra/docker/service.Dockerfile \
#     --build-arg SERVICE_PATH=apps/services/auth-service \
#     -t campusflow/auth-service .
#
# The build context MUST be the repo root so go.work and proto/gen are available.

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM golang:1.25.3-alpine AS builder

ARG SERVICE_PATH

RUN apk add --no-cache git ca-certificates

WORKDIR /src

# Copy entire workspace. We rely on go.work to resolve module paths.
COPY go.work go.work.sum ./
COPY proto ./proto
COPY apps/services ./apps/services

# Pre-fetch dependencies for the target service to leverage build caching.
WORKDIR /src/${SERVICE_PATH}
RUN go mod download

# Build a static-ish binary. CGO disabled so we can run on scratch/distroless.
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=builder /out/server /app/server

USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
