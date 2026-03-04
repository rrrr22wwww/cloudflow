package main

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rrrr22wwww.com/cloudflow/internal/domain"
)

func main() {

	s, err := domain.NewProduct("Phone X", "Best gadget", "999", "4", []string{"tech", "new"}, time.Now().Unix(), time.Now().Unix(), uuid.New(), uuid.New())
	if err != nil {
		fmt.Print("err")
	}
	fmt.Printf("%v", s.CategoryID)
}
