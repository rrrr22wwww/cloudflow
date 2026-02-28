package domain

import (
	"strconv"
	"time"
)

type Product struct {
	ID          string
	SellerID    string
	Name        string
	Discription string
	Price       string
	Rating      string
	Tags        []string
	CreateAt    time.Duration
	EditeAt     time.Duration
}

const (
	MaxNameLenght       = 10
	MaxDiscriptionLeght = 200
)

func NewProduct(id, sellerid, name, discription, price, rating string, tags []string, CreateAt, EditAt int64) (*Product, error) {
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

	return &Product{id, sellerid, name, discription, price, rating, tags, time.Duration(CreateAt), time.Duration(EditAt)}, nil
}
