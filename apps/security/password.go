// Package security implements password hashing with Argon2id (RFC 9106).
//
// Hashes are stored in a self-describing format so that parameters can be
// tuned later without breaking existing hashes:
//
//	argon2id$<memory>$<iterations>$<parallelism>$<base64(salt)>$<base64(hash)>
package security

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

// PasswordHasher holds Argon2id parameters.
type PasswordHasher struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

// Option configures a PasswordHasher.
type Option func(*PasswordHasher)

func WithMemory(kib uint32) Option { return func(h *PasswordHasher) { h.memory = kib } }
func WithIterations(n uint32) Option { return func(h *PasswordHasher) { h.iterations = n } }
func WithParallelism(n uint8) Option { return func(h *PasswordHasher) { h.parallelism = n } }
func WithSaltLength(n uint32) Option { return func(h *PasswordHasher) { h.saltLength = n } }
func WithKeyLength(n uint32) Option { return func(h *PasswordHasher) { h.keyLength = n } }

// NewPasswordHasher returns a hasher with sane defaults
// (64 MiB memory, 3 iterations, 4 lanes — in line with OWASP recommendations).
func NewPasswordHasher(opts ...Option) *PasswordHasher {
	h := &PasswordHasher{
		memory:      64 * 1024,
		iterations:  3,
		parallelism: 4,
		saltLength:  16,
		keyLength:   32,
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// Hash derives an Argon2id hash of the password with a fresh random salt
// and returns it in the storable string format described above.
func (h *PasswordHasher) Hash(password string) (string, error) {
	salt := make([]byte, h.saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, h.iterations, h.memory, h.parallelism, h.keyLength)

	encoded := fmt.Sprintf("argon2id$%d$%d$%d$%s$%s",
		h.memory,
		h.iterations,
		h.parallelism,
		base64.StdEncoding.EncodeToString(salt),
		base64.StdEncoding.EncodeToString(hash),
	)
	return encoded, nil
}

// Verify reports whether password matches the stored hash.
// The comparison is constant-time to avoid timing attacks.
func Verify(stored string, password string) (bool, error) {
	parts := strings.Split(stored, "$")
	if len(parts) != 6 || parts[0] != "argon2id" {
		return false, fmt.Errorf("verify: malformed hash format")
	}

	memory, err := parseUint32(parts[1])
	if err != nil {
		return false, fmt.Errorf("verify: parse memory: %w", err)
	}
	iterations, err := parseUint32(parts[2])
	if err != nil {
		return false, fmt.Errorf("verify: parse iterations: %w", err)
	}
	parallelism, err := strconv.ParseUint(parts[3], 10, 8)
	if err != nil {
		return false, fmt.Errorf("verify: parse parallelism: %w", err)
	}

	salt, err := base64.StdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, fmt.Errorf("verify: decode salt: %w", err)
	}
	expected, err := base64.StdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, fmt.Errorf("verify: decode hash: %w", err)
	}

	computed := argon2.IDKey([]byte(password), salt, iterations, memory, uint8(parallelism), uint32(len(expected)))

	return subtle.ConstantTimeCompare(expected, computed) == 1, nil
}

func parseUint32(s string) (uint32, error) {
	v, err := strconv.ParseUint(s, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint32(v), nil
}
