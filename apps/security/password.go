package security

import (
	"crypto/rand"
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

func RetnPapper() string {
	return "aS123das1@%*&#!^s"
}

// (password []byte, salt []byte, time uint32, memory uint32, threads uint8, keyLen uint32) []byte
func (h *PasswordHasher) Generate(pass string) ([]byte, error) {
	password := make([]byte, len(pass))
	salt := make([]byte, h.saltLength)

	if _, err := rand.Read(salt); err != nil {
		return password, fmt.Errorf("generate salt: %w", err)
	}

	hash := argon2.IDKey(password, salt, h.iterations, h.memory, h.parallelism, h.keyLength)
	return hash, nil
}

// func main() {
// 	k := NewHashPassword()
// 	l, err := k.Generate("testpass")
// 	if err != nil {
// 		panic("err")
// 	}
// 	fmt.Printf("%s", l)
// }
