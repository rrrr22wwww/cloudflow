package domain

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID
	Name      string
	Role      string
	Rating    float64
	Balance   int64
	CreatedAt time.Time
}

const (
	maxNameLength = 30
	minNameLength = 2
)

func NewUser(ID uuid.UUID, Name string, Role string, Rating float64, Balance int64, CreatedAt time.Time) (*User, error) {
	if len(Name) > maxNameLength || len(Name) < minNameLength {
		return nil, ErrCurrentName
	}
	return &User{
		ID:        ID,
		Name:      Name,
		Role:      Role,
		Rating:    Rating,
		Balance:   Balance,
		CreatedAt: CreatedAt,
	}, nil
}
