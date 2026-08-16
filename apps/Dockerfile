# syntax=docker/dockerfile:1
# Build context is the REPOSITORY ROOT (migrations live in lib/):
#   docker build -f apps/Dockerfile --target server  -t cloudflow-api .
#   docker build -f apps/Dockerfile --target migrate -t cloudflow-migrate .

# ---------- Builder ----------
FROM golang:1.25-alpine AS builder

WORKDIR /src

# Cache dependencies separately from source changes
COPY apps/go.mod apps/go.sum ./
RUN go mod download

COPY apps/ ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/server ./cmd/server

# goose CLI for the migrate image
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

# ---------- API server ----------
FROM alpine:3.20 AS server

RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 10001 appuser

COPY --from=builder /out/server /usr/local/bin/server

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["server"]

# ---------- Migrations runner ----------
FROM alpine:3.20 AS migrate

RUN apk add --no-cache ca-certificates

COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY lib/migration/postgres /migrations

ENV GOOSE_DRIVER=postgres \
    GOOSE_MIGRATION_DIR=/migrations

ENTRYPOINT ["goose"]
CMD ["up"]
