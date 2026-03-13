package domain

import "errors"

var (
	ErrProductNotFound  = errors.New("Product not found!")
	ErrPriceValue       = errors.New("Price must be greater than zero!")
	ErrValueToLong      = errors.New("Reached to maximun lenght!")
	ErrNotCurrDataField = errors.New("Not current size field ")
	ErrAmount           = errors.New("Not currect value amount")
	ErrGenUUID          = errors.New("Error generation UUID")
	ErrCurrentName      = errors.New("Name user not current")
)
