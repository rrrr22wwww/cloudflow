package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/rrrr22wwww.com/cloudflow/graph/model"
	"github.com/rrrr22wwww.com/cloudflow/internal/database"
	"github.com/rrrr22wwww.com/cloudflow/security"
)

func Login(ctx context.Context, db *sql.DB, store SessionStore, jwtSecret string, jwtTTL time.Duration, email, password string) (string, *model.User, error) {
	userID, user, role, err := verifyCredentials(ctx, db, email, password)
	if err != nil {
		return "", nil, err
	}

	token, err := issueSessionToken(ctx, store, jwtSecret, jwtTTL, userID, role)
	if err != nil {
		return "", nil, fmt.Errorf("generate token: %w", err)
	}

	return token, user, nil
}

type EmailLoginCodeRequest struct {
	ChallengeID string
	Email       string
	ExpiresIn   int
}

func RequestEmailLoginCode(ctx context.Context, db *sql.DB, otpStore *EmailOTPStore, sender EmailSender, email, password string) (*EmailLoginCodeRequest, error) {
	if otpStore == nil {
		return nil, fmt.Errorf("email otp store is not configured")
	}
	if sender == nil {
		return nil, ErrEmailSenderNotConfigured
	}

	userID, user, role, err := verifyCredentials(ctx, db, email, password)
	if err != nil {
		return nil, err
	}

	challengeID, code, expiresIn, err := otpStore.Create(userID, user.Email, role)
	if err != nil {
		return nil, err
	}

	if err := sender.SendLoginCode(ctx, user.Email, code); err != nil {
		return nil, err
	}

	return &EmailLoginCodeRequest{
		ChallengeID: challengeID,
		Email:       MaskEmail(user.Email),
		ExpiresIn:   expiresIn,
	}, nil
}

func VerifyEmailLoginCode(ctx context.Context, db *sql.DB, store SessionStore, otpStore *EmailOTPStore, jwtSecret string, jwtTTL time.Duration, challengeID, code string) (string, *model.User, error) {
	if otpStore == nil {
		return "", nil, fmt.Errorf("email otp store is not configured")
	}
	if challengeID == "" || code == "" {
		return "", nil, fmt.Errorf("challenge_id and code are required")
	}

	challenge, err := otpStore.Verify(challengeID, code)
	if err != nil {
		return "", nil, err
	}

	users, err := database.GetUsers(db, ctx, nil, nil, &challenge.UserID)
	if err != nil {
		return "", nil, fmt.Errorf("get user: %w", err)
	}
	if len(users) == 0 {
		return "", nil, fmt.Errorf("invalid 2fa challenge")
	}

	token, err := issueSessionToken(ctx, store, jwtSecret, jwtTTL, challenge.UserID, challenge.Role)
	if err != nil {
		return "", nil, fmt.Errorf("generate token: %w", err)
	}

	return token, users[0], nil
}

func verifyCredentials(ctx context.Context, db *sql.DB, email, password string) (string, *model.User, string, error) {
	if email == "" || password == "" {
		return "", nil, "", fmt.Errorf("invalid credentials")
	}

	userID, storedHash, err := database.GetUserCredentialsByEmail(db, ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil, "", fmt.Errorf("invalid credentials")
		}
		return "", nil, "", fmt.Errorf("get user by email: %w", err)
	}

	ok, err := security.Verify(storedHash, password)
	if err != nil || !ok {
		return "", nil, "", fmt.Errorf("invalid credentials")
	}

	users, err := database.GetUsers(db, ctx, nil, &email, nil)
	if err != nil {
		return "", nil, "", fmt.Errorf("get user: %w", err)
	}
	if len(users) == 0 {
		return "", nil, "", fmt.Errorf("invalid credentials")
	}

	user := users[0]
	role := "User"
	if user.Role != nil {
		role = *user.Role
	}

	return userID, user, role, nil
}

func Registration(ctx context.Context, db *sql.DB, store SessionStore, jwtSecret string, jwtTTL time.Duration, name, email, imgUser, password string) (string, *model.User, error) {
	if len(name) < 4 {
		return "", nil, fmt.Errorf("small size name")
	}

	hash := security.GuardHash{
		Hasher: security.NewHashPassword(),
	}
	b64Hash, err := hash.HashFromDB(password)
	if err != nil {
		return "", nil, fmt.Errorf("hash: %w", err)
	}

	user := &model.User{}
	if err := database.CreatUser(db, ctx, user, &name, &email, &imgUser, &b64Hash); err != nil {
		return "", nil, fmt.Errorf("create user: %w", err)
	}

	role := "User"
	if user.Role != nil {
		role = *user.Role
	}

	token, err := issueSessionToken(ctx, store, jwtSecret, jwtTTL, user.ID, role)
	if err != nil {
		return "", nil, fmt.Errorf("generate token: %w", err)
	}

	return token, user, nil
}

func Logout(ctx context.Context, store SessionStore, token string) (bool, error) {
	if token == "" {
		return false, fmt.Errorf("token is required")
	}

	if err := store.Delete(ctx, token); err != nil {
		return false, fmt.Errorf("delete session: %w", err)
	}

	return true, nil
}

func issueSessionToken(ctx context.Context, store SessionStore, jwtSecret string, jwtTTL time.Duration, userID, role string) (string, error) {
	token, err := GenerateToken(jwtSecret, userID, role, jwtTTL)
	if err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}

	session := &Session{
		UserID:    userID,
		Role:      role,
		ExpiresAt: time.Now().UTC().Add(jwtTTL),
	}

	if err := store.Set(ctx, token, session, jwtTTL); err != nil {
		return "", fmt.Errorf("save session: %w", err)
	}

	return token, nil
}

func ResetPassword() {}
