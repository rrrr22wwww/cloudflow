package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/patrickmn/go-cache"
	"github.com/rrrr22wwww/cloudflow/internal/database"
)

type MemorySessionStore struct {
	cache *cache.Cache
	db    *sql.DB
}

func NewMemorySessionStore(db *sql.DB, defaultTTL time.Duration) *MemorySessionStore {
	return &MemorySessionStore{
		cache: cache.New(defaultTTL, defaultTTL*2),
		db:    db,
	}
}

func (m *MemorySessionStore) Get(ctx context.Context, token string) (*Session, error) {
	if val, found := m.cache.Get(token); found {
		sess, ok := val.(*Session)
		if ok {
			if time.Now().UTC().After(sess.ExpiresAt) {
				m.cache.Delete(token)
				return nil, fmt.Errorf("session expired")
			}
			return sess, nil
		}
	}

	userID, role, expiresAt, err := database.GetUserSessionByToken(ctx, m.db, token)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	sess := &Session{
		UserID:    userID,
		Role:      role,
		ExpiresAt: expiresAt,
	}

	ttl := time.Until(expiresAt)
	if ttl > 0 {
		m.cache.Set(token, sess, ttl)
	}

	return sess, nil
}

func (m *MemorySessionStore) Set(ctx context.Context, token string, session *Session, ttl time.Duration) error {
	m.cache.Set(token, session, ttl)

	err := database.CreateUserSession(ctx, m.db, session.UserID, token, session.ExpiresAt)
	if err != nil {
		m.cache.Delete(token)
		return fmt.Errorf("persist session: %w", err)
	}

	return nil
}

func (m *MemorySessionStore) Delete(ctx context.Context, token string) error {
	m.cache.Delete(token)

	_, err := database.DeleteUserSessionByToken(ctx, m.db, token)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}

	return nil
}
