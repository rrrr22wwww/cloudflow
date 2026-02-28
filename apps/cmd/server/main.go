package main

import (
	"fmt"

	"github.com/rrrr22wwww.com/cloudflow/internal/domain"
)

func main() {
	s, err := domain.NewProduct("1231", "1231", "ыыыыыыыыыыыыыыы", "chel", "200$", "2,3", []string{"asdasd", "adad"}, int64(123132), int64(12313132))
	if err != nil {
		fmt.Print("err")
	}
	fmt.Printf("%v", s)
}
