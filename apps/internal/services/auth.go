package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/rrrr22wwww/cloudflow/graph/model"
	"github.com/rrrr22wwww/cloudflow/internal/database"
	"github.com/rrrr22wwww/cloudflow/security"
)

// ErrInvalidCredentials is returned for every credential failure — wrong
// password, unknown email, malformed stored hash — so a caller (and
// therefore an attacker) cannot distinguish between them.
var ErrInvalidCredentials = errors.New("invalid credentials")

// decoyHash is a well-formed Argon2id hash of no particular password.
// When a login is attempted for an email that does not exist, the
// password is verified against this hash anyway, so the request takes
// the same time as a real verification. Without this, "unknown email"
// returns noticeably faster than "wrong password", letting an attacker
// enumerate registered emails by timing.
const decoyHash = "argon2id$65536$3$4$Yyus9EiONgOmeAqzZOfjEA==$DM3dcrhAYAjlhpfI/8MEpyesfvqL6ydIKeGlQgr7XTw="

// Login verifies the email/password pair and, on success, issues a JWT
// backed by a server-side session.
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

// EmailLoginCodeRequest describes an issued email OTP challenge.
type EmailLoginCodeRequest struct {
	ChallengeID string
	Email       string
	ExpiresIn   int
}

// RequestEmailLoginCode verifies the password and, on success, emails a
// one-time code to the user, returning a challenge to complete via
// VerifyEmailLoginCode.
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

// VerifyEmailLoginCode exchanges a valid challenge/code pair for a JWT.
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

	users, err := database.GetUsers(ctx, db, nil, nil, &challenge.UserID)
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

// verifyCredentials checks the email/password pair. All failure modes
// return ErrInvalidCredentials and take a comparable amount of time (see
// decoyHash).
func verifyCredentials(ctx context.Context, db *sql.DB, email, password string) (string, *model.User, string, error) {
	if email == "" || password == "" {
		return "", nil, "", ErrInvalidCredentials
	}

	userID, storedHash, err := database.GetUserCredentialsByEmail(ctx, db, email)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			// Burn the same CPU time as a real verification.
			_, _ = security.Verify(decoyHash, password)
			return "", nil, "", ErrInvalidCredentials
		}
		return "", nil, "", fmt.Errorf("get user by email: %w", err)
	}

	ok, err := security.Verify(storedHash, password)
	if err != nil || !ok {
		return "", nil, "", ErrInvalidCredentials
	}

	users, err := database.GetUsers(ctx, db, nil, &email, nil)
	if err != nil {
		return "", nil, "", fmt.Errorf("get user: %w", err)
	}
	if len(users) == 0 {
		return "", nil, "", ErrInvalidCredentials
	}

	user := users[0]
	role := RoleUser
	if user.Role != nil {
		role = *user.Role
	}

	return userID, user, role, nil
}

// Registration creates a user with a hashed password and logs them in.
func Registration(ctx context.Context, db *sql.DB, store SessionStore, jwtSecret string, jwtTTL time.Duration, name, email, imgUser, password string) (string, *model.User, error) {
	if len(name) < 4 {
		return "", nil, fmt.Errorf("name must be at least 4 characters long")
	}
	if len(password) < 8 {
		return "", nil, fmt.Errorf("password must be at least 8 characters long")
	}

	hashedPassword, err := security.NewPasswordHasher().Hash(password)
	if err != nil {
		return "", nil, fmt.Errorf("hash password: %w", err)
	}

	user := &model.User{}
	if err := database.CreateUser(ctx, db, user, &name, &email, &imgUser, &hashedPassword); err != nil {
		return "", nil, fmt.Errorf("create user: %w", err)
	}

	role := RoleUser
	if user.Role != nil {
		role = *user.Role
	}

	token, err := issueSessionToken(ctx, store, jwtSecret, jwtTTL, user.ID, role)
	if err != nil {
		return "", nil, fmt.Errorf("generate token: %w", err)
	}

	return token, user, nil
}

// Logout deletes the session, revoking the token immediately.
func Logout(ctx context.Context, store SessionStore, token string) (bool, error) {
	if token == "" {
		return false, fmt.Errorf("token is required")
	}

	if err := store.Delete(ctx, token); err != nil {
		return false, fmt.Errorf("delete session: %w", err)
	}

	return true, nil
}

// issueSessionToken creates a signed JWT and persists the matching
// server-side session; the token is valid only while the session exists.
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
