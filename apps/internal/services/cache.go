package services

import (
	"context"
	"time"
)

type Session struct {
	UserID    string
	Role      string
	ExpiresAt time.Time
}

type SessionStore interface {
	Get(ctx context.Context, token string) (*Session, error)
	Set(ctx context.Context, token string, session *Session, ttl time.Duration) error
	Delete(ctx context.Context, token string) error
}
