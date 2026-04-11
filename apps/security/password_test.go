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
	test := "фывфвывфвфывssdas"
	fmt.Printf("%v", l)
	fmt.Printf("%v", []rune(test))
	for i := 0; len(l) > i; i++ {
		fmt.Print(string(l[i]))
	}

	// fmt.Printf("%s", string(l))
}
