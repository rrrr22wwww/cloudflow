package security

import (
	"fmt"
	"testing"
)

func TestGenerate(t *testing.T) {
	hash := NewHashPassword()
	l, err := hash.Generate("131asdasa")
	if err != nil {
		panic("err")
	}

	fmt.Println(l)
}
