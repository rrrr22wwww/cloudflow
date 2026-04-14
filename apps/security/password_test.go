package security

import (
	"fmt"
	"testing"
)

var password string = "131asdasa"

func TestGenerate(t *testing.T) {

	hash := GuardHash{
		Hasher: NewHashPassword(),
	}
	l, err := hash.HashFromDB(password)
	if err != nil {
		panic(fmt.Errorf("Generation Hash: %w", err))
	}
	fmt.Println(l)
}

func TestVerify(t *testing.T) {
	hash := GuardHash{
		Hasher: NewHashPassword(),
	}
	b64Hash, err := hash.HashFromDB(password)

	if err != nil {
		panic(fmt.Errorf("Generation Hash: %w", err))
	}
	ok, err := Verify(b64Hash, password)
	if ok {
		fmt.Printf("Verify: simular password - OK\n")
	} else {
		fmt.Printf("Verify: different password - ERR\n")
	}
}
