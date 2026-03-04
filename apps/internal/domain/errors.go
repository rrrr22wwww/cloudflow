package domain

import "errors"

var (
	ErrProductNotFound  = errors.New("Product not found!")
	ErrPriceValue       = errors.New("Price must be greater than zero!")
	ErrValueToLong      = errors.New("Reached to maximun lenght!")
	ErrNotCurrDataField = errors.New("Not current size field ")
)
