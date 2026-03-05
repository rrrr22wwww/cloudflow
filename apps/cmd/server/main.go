package main

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/rrrr22wwww.com/cloudflow/internal/domain"
)

func main() {

	p, err := domain.NewProduct("Phone X", "Best gadget", "999", "4", []string{"tech", "new"}, uuid.New(), uuid.New())
	if err != nil {
		fmt.Print("err")
	}
	t, err := domain.NewTag("nameslug", "creator")
	if err != nil {
		fmt.Print("err")
	}

	fmt.Printf("%v \n %v", p.CategoryID, (*t).Name)
}
