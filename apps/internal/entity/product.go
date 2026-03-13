package domain

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID          uuid.UUID
	SellerID    uuid.UUID
	CategoryID  int32
	Name        string
	Description string
	Price       int64
	Rating      float64
	Tags        []string
	CreatedAt   time.Time
	EditedAt    time.Time
}

type Tag struct {
	ID        int32
	Name      string
	CreatedAt time.Time
}

type Category struct {
	ID        int32
	Name      string
	ParentID  *int32
	CreatedAt time.Time
}

const (
	MIN_NAME_LENGTH     = 2
	MAX_NAME_LENHTH     = 10
	MAX_DESCRIPT_LENGTH = 200
)

func NewProduct(name, description string, tags []string, sellerid, ctgryID int32, rating float64, price int64, SellerID uuid.UUID) (*Product, error) {
	if len([]rune(name)) > MAX_NAME_LENHTH || len([]rune(name)) < MIN_NAME_LENGTH {
		return nil, ErrValueToLong
	}
	if price < 0 {
		return nil, ErrPriceValue
	}
	if len([]rune(description)) > MAX_DESCRIPT_LENGTH {
		return nil, ErrValueToLong
	}
	return &Product{
		SellerID:    SellerID,
		CategoryID:  ctgryID,
		Name:        name,
		Description: description,
		Price:       price,
		Rating:      rating,
		Tags:        tags,
		CreatedAt:   time.Now(),
		EditedAt:    time.Now(),
	}, nil
}

func NewTag(name string) (*Tag, error) {
	if len(name) < MIN_NAME_LENGTH {
		return nil, ErrNotCurrDataField
	}

	return &Tag{0, name, time.Now()}, nil
}

func NewCotegory(name string, ParentID *int32) (*Cotegory, error) {

	if len(name) < MIN_NAME_LENGTH {
		return nil, ErrNotCurrDataField
	}

	return &Cotegory{0, name, ParentID, time.Now()}, nil
}
