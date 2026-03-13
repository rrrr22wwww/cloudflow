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
	MAX_LENGHT_NAME = 30
	MIN_LENGHT_NAME = 2
)

func CreatUser(ID uuid.UUID, Name string, Role string, Rating float64, Balance int64, CreatedAt time.Time) (*User, error) {
	if MAX_LENGHT_NAME > len(Name) || MIN_LENGHT_NAME < len(Name) {
		return nil, ErrCurrentName
	}
	return &User{
		Name:      Name,
		Role:      Role,
		Rating:    Rating,
		Balance:   Balance,
		CreatedAt: CreatedAt,
	}, nil
}
