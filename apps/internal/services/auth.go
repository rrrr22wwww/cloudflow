package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/rrrr22wwww.com/cloudflow/internal/database"
	"github.com/rrrr22wwww.com/cloudflow/security"
)

const sessionTTL = 24 * time.Hour
const sessionTokenLength = 32

type Usr struct {
	N string
	E string
	I string
	P string
}

func Auth() {}

func Registration(ctx context.Context, name, email, imgUser, password string) (*Usr, error) {
	_ = ctx

	if len(name) < 4 {
		return nil, fmt.Errorf("Small size name")
	}
	hash := security.GuardHash{
		Hasher: security.NewHashPassword(),
	}
	b64Hash, err := hash.HashFromDB(password)
	if err != nil {
		return nil, fmt.Errorf("hash: %w", err)
	}

	return &Usr{
		N: name,
		E: email,
		I: imgUser,
		P: b64Hash,
	}, nil
}

func Login(ctx context.Context, db *sql.DB, email, password string) (string, error) {
	if email == "" || password == "" {
		return "", fmt.Errorf("invalid credentials")
	}

	userID, storedHash, err := database.GetUserCredentialsByEmail(db, ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("invalid credentials")
		}

		return "", fmt.Errorf("get user by email: %w", err)
	}

	ok, err := security.Verify(storedHash, password)
	if err != nil || !ok {
		return "", fmt.Errorf("invalid credentials")
	}

	token, err := generateSessionToken()
	if err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}

	expiresAt := time.Now().UTC().Add(sessionTTL)
	if err = database.CreateUserSession(db, ctx, userID, token, expiresAt); err != nil {
		return "", fmt.Errorf("create session: %w", err)
	}

	return token, nil
}

func Logout(ctx context.Context, db *sql.DB, token string) (bool, error) {
	if token == "" {
		return false, fmt.Errorf("token is required")
	}

	if _, err := database.DeleteUserSessionByToken(db, ctx, token); err != nil {
		return false, fmt.Errorf("delete session: %w", err)
	}

	return true, nil
}

func generateSessionToken() (string, error) {
	b := make([]byte, sessionTokenLength)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(b), nil
}

func ResetPassword() {}
