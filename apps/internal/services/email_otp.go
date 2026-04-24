package services

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/patrickmn/go-cache"
)

const (
	defaultEmailOTPMaxAttempts = 5
	emailOTPCodeDigits         = 6
)

var (
	ErrEmailOTPExpired      = errors.New("2fa code expired")
	ErrEmailOTPTooManyTries = errors.New("too many 2fa attempts")
	ErrEmailOTPInvalid      = errors.New("invalid 2fa code")
)

type EmailOTPChallenge struct {
	UserID    string
	Email     string
	Role      string
	CodeHash  string
	Attempts  int
	ExpiresAt time.Time
}

type EmailOTPStore struct {
	cache       *cache.Cache
	secret      string
	ttl         time.Duration
	maxAttempts int
}

func NewEmailOTPStore(ttl time.Duration, secret string) *EmailOTPStore {
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	if secret == "" {
		secret = "cloudflow-email-otp-dev-secret"
	}

	return &EmailOTPStore{
		cache:       cache.New(ttl, ttl*2),
		secret:      secret,
		ttl:         ttl,
		maxAttempts: defaultEmailOTPMaxAttempts,
	}
}

func (s *EmailOTPStore) Create(userID, email, role string) (string, string, int, error) {
	code, err := randomNumericCode(emailOTPCodeDigits)
	if err != nil {
		return "", "", 0, fmt.Errorf("generate code: %w", err)
	}

	challengeID := uuid.NewString()
	challenge := &EmailOTPChallenge{
		UserID:    userID,
		Email:     email,
		Role:      role,
		CodeHash:  s.hashCode(challengeID, code),
		ExpiresAt: time.Now().UTC().Add(s.ttl),
	}

	s.cache.Set(challengeID, challenge, s.ttl)
	return challengeID, code, int(s.ttl.Seconds()), nil
}

func (s *EmailOTPStore) Verify(challengeID, code string) (*EmailOTPChallenge, error) {
	value, ok := s.cache.Get(challengeID)
	if !ok {
		return nil, ErrEmailOTPExpired
	}

	challenge, ok := value.(*EmailOTPChallenge)
	if !ok || time.Now().UTC().After(challenge.ExpiresAt) {
		s.cache.Delete(challengeID)
		return nil, ErrEmailOTPExpired
	}

	if challenge.Attempts >= s.maxAttempts {
		s.cache.Delete(challengeID)
		return nil, ErrEmailOTPTooManyTries
	}

	challenge.Attempts++
	if subtle.ConstantTimeCompare([]byte(challenge.CodeHash), []byte(s.hashCode(challengeID, code))) != 1 {
		return nil, ErrEmailOTPInvalid
	}

	s.cache.Delete(challengeID)
	return challenge, nil
}

func (s *EmailOTPStore) hashCode(challengeID, code string) string {
	mac := hmac.New(sha256.New, []byte(s.secret))
	mac.Write([]byte(challengeID))
	mac.Write([]byte(":"))
	mac.Write([]byte(code))
	return hex.EncodeToString(mac.Sum(nil))
}

func randomNumericCode(digits int) (string, error) {
	if digits <= 0 {
		return "", fmt.Errorf("digits must be positive")
	}

	min := int64(1)
	for i := 1; i < digits; i++ {
		min *= 10
	}
	max := min * 10

	n, err := rand.Int(rand.Reader, big.NewInt(max-min))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%0*d", digits, n.Int64()+min), nil
}

func MaskEmail(email string) string {
	at := -1
	for i, r := range email {
		if r == '@' {
			at = i
			break
		}
	}
	if at <= 0 || at == len(email)-1 {
		return email
	}

	name := email[:at]
	domain := email[at+1:]
	visible := 2
	if len(name) < visible {
		visible = len(name)
	}

	stars := len(name) - visible
	if stars < 2 {
		stars = 2
	}

	return name[:visible] + repeat("*", stars) + "@" + domain
}

func repeat(value string, count int) string {
	out := ""
	for i := 0; i < count; i++ {
		out += value
	}
	return out
}
