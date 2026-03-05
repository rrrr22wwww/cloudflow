package domain

import (
	"strconv"
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID          uuid.UUID
	SellerID    uuid.UUID
	CategoryID  uuid.UUID
	Name        string
	Discription string
	Price       string
	Rating      string
	Tags        []string
	CreateAt    time.Duration
	EditeAt     time.Duration
}

type Tag struct {
	ID   uuid.UUID
	Slug string
	Name string
}

type Cotegory struct {
	ID       uuid.UUID
	Name     string
	Slug     string
	ParentID uuid.UUID
}

const (
	MaxNameLenght       = 10
	MaxDiscriptionLeght = 200
)

func NewProduct(name, discription, price, rating string, tags []string, sellerid, ctgryID uuid.UUID) (*Product, error) {
	p, err := strconv.Atoi(price)
	if err != nil {
		return nil, ErrPriceValue
	}
	if len([]rune(name)) > MaxNameLenght {
		return nil, ErrValueToLong
	}
	if p < 0 {
		return nil, ErrPriceValue
	}
	if len([]rune(discription)) > MaxDiscriptionLeght {
		return nil, ErrValueToLong
	}
	id, err := uuid.NewV7()
	if err != nil {
		return nil, ErrGenUUID
	}

	return &Product{id, sellerid, ctgryID, name, discription, price, rating, tags, time.Duration(time.Now().Unix()), time.Duration(time.Now().Unix())}, nil
}

func NewTag(slug, name string) (*Tag, error) {
	if len(slug) < 0 {
		return nil, ErrNotCurrDataField
	}
	if len(name) < 2 {
		return nil, ErrNotCurrDataField
	}
	id, err := uuid.NewV7()
	if err != nil {
		return nil, ErrGenUUID
	}
	return &Tag{id, slug, name}, nil
}

func NewCotegory(name, slug string) (*Cotegory, error) {
	if len(slug) < 0 {
		return nil, ErrNotCurrDataField
	}
	if len(name) < 2 {
		return nil, ErrNotCurrDataField
	}
	return &Cotegory{uuid.New(), name, slug, uuid.New()}, nil
}
