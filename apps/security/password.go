package security

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

type GuardHash struct {
	Hasher *PasswordHasher
	Buffer []byte
}

type PasswordHasher struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

func NewHashPassword(opts ...func(p *PasswordHasher)) *PasswordHasher {
	h := &PasswordHasher{
		memory:      64 * 1024,
		iterations:  3,
		parallelism: 6,
		saltLength:  16,
		keyLength:   32,
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}
func newMemory(std uint32) func(h *PasswordHasher) {
	return func(h *PasswordHasher) { h.memory = std }
}
func newIterations(std uint32) func(h *PasswordHasher) {
	return func(h *PasswordHasher) { h.iterations = std }
}
func newParallelism(std uint8) func(h *PasswordHasher) {
	return func(h *PasswordHasher) { h.parallelism = std }
}
func newSaltLength(std uint32) func(h *PasswordHasher) {
	return func(h *PasswordHasher) { h.saltLength = std }
}
func newKeyLength(std uint32) func(h *PasswordHasher) {
	return func(h *PasswordHasher) { h.keyLength = std }

}
func (h *GuardHash) HashFromDB(pass string) (string, error) {
	hash, err := h.Generate(pass)
	if err != nil {
		return "", fmt.Errorf("ErrorGenHash: %w", err)
	}
	storedHash := fmt.Sprintf("%s$%d$%d$%d$%s$%s",
		"argon2id",
		h.Hasher.memory,
		h.Hasher.iterations,
		h.Hasher.parallelism,
		base64.StdEncoding.EncodeToString(h.Buffer),
		base64.StdEncoding.EncodeToString(hash))
	return storedHash, nil
}

// (password []byte, salt []byte, time uint32, memory uint32, threads uint8, keyLen uint32) []byte
func (h *GuardHash) Generate(pass string) ([]byte, error) {
	password := []byte(pass)
	salt := make([]byte, h.Hasher.saltLength)

	if _, err := rand.Read(salt); err != nil {
		return nil, fmt.Errorf("generate salt: %w", err)
	}
	hash := argon2.IDKey(password, salt, h.Hasher.iterations, h.Hasher.memory, h.Hasher.parallelism, h.Hasher.keyLength)
	h.Buffer = salt
	return hash, nil
}

func fastAtoi(s string) *uint32 {
	var res uint32
	for i := 0; i < len(s); i++ {
		res = res*10 + uint32(s[i]-'0')
	}
	return &res
}

func Verify(hash string, password string) (bool, error) {
	parts := strings.Split(hash, "$")
	if len(parts) < 6 {
		return false, fmt.Errorf("Verify: error hash decoding element(field < 6) ")
	}
	storedHash, err := base64.StdEncoding.DecodeString(parts[5])
	salt, err := base64.StdEncoding.DecodeString(parts[4])
	unit := GuardHash{
		Hasher: NewHashPassword(
			newMemory(*fastAtoi(parts[1])),
			newIterations(*fastAtoi(parts[2])),
			newParallelism(uint8(*fastAtoi(parts[3]))),
		),
	}
	computedHash := argon2.IDKey([]byte(password), salt, unit.Hasher.iterations, unit.Hasher.memory, unit.Hasher.parallelism, unit.Hasher.keyLength)

	if err != nil {
		return false, fmt.Errorf("error base64decodeString: %w", err)
	}
	ok := subtle.ConstantTimeCompare(storedHash, computedHash) == 1
	return ok, nil
}
