package security

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"

	"golang.org/x/crypto/argon2"
)

type PasswordHasher struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

func NewHashPassword() *PasswordHasher {
	return &PasswordHasher{
		memory:      64 * 1024,
		iterations:  3,
		parallelism: 6,
		saltLength:  16,
		keyLength:   32,
	}
}

// (password []byte, salt []byte, time uint32, memory uint32, threads uint8, keyLen uint32) []byte
func (h *PasswordHasher) Generate(pass string) (string, error) {
	password := []byte(pass)
	salt := make([]byte, h.saltLength)

	if _, err := rand.Read(salt); err != nil {
		return pass, fmt.Errorf("generate salt: %w", err)
	}
	hash := argon2.IDKey(password, salt, h.iterations, h.memory, h.parallelism, h.keyLength)
	rtndata := fmt.Sprintf("%s$%d$%d$%d$%s$%s", "argon2id", h.memory,
		h.iterations, h.parallelism,
		base64.StdEncoding.EncodeToString(salt), base64.StdEncoding.EncodeToString(hash))
	return rtndata, nil
}
