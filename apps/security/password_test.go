package security

import (
	"strings"
	"testing"
)

func TestHashAndVerify(t *testing.T) {
	hasher := NewPasswordHasher()

	hash, err := hasher.Hash("correct horse battery staple")
	if err != nil {
		t.Fatalf("Hash returned error: %v", err)
	}

	if !strings.HasPrefix(hash, "argon2id$") {
		t.Fatalf("hash has unexpected format: %s", hash)
	}

	ok, err := Verify(hash, "correct horse battery staple")
	if err != nil {
		t.Fatalf("Verify returned error: %v", err)
	}
	if !ok {
		t.Fatal("Verify returned false for the correct password")
	}
}

func TestVerifyRejectsWrongPassword(t *testing.T) {
	hasher := NewPasswordHasher()

	hash, err := hasher.Hash("password-one")
	if err != nil {
		t.Fatalf("Hash returned error: %v", err)
	}

	ok, err := Verify(hash, "password-two")
	if err != nil {
		t.Fatalf("Verify returned error: %v", err)
	}
	if ok {
		t.Fatal("Verify returned true for a wrong password")
	}
}

func TestHashesAreSalted(t *testing.T) {
	hasher := NewPasswordHasher()

	h1, err := hasher.Hash("same-password")
	if err != nil {
		t.Fatalf("Hash returned error: %v", err)
	}
	h2, err := hasher.Hash("same-password")
	if err != nil {
		t.Fatalf("Hash returned error: %v", err)
	}

	if h1 == h2 {
		t.Fatal("two hashes of the same password are identical: salt is not random")
	}
}

func TestVerifyRejectsMalformedHash(t *testing.T) {
	cases := []string{
		"",
		"not-a-hash",
		"argon2id$abc$3$4$c2FsdA==$aGFzaA==", // non-numeric memory
		"argon2id$65536$3$4$%%%$aGFzaA==",    // invalid base64 salt
		"md5$1$1$1$c2FsdA==$aGFzaA==",        // wrong algorithm
	}

	for _, c := range cases {
		if ok, err := Verify(c, "whatever"); err == nil || ok {
			t.Errorf("Verify(%q) = (%v, %v); want error and false", c, ok, err)
		}
	}
}
