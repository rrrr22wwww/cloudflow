package domain

import (
	"time"

	"github.com/google/uuid"
)

type orders struct {
	ID          uuid.UUID
	ByerID      string
	SellerID    string
	Satus       int32
	TotalAmount int32
	CreateAt    time.Duration
	EditAt      time.Duration
}

type order_items struct {
	ID              uuid.UUID
	OrderID         string
	ProductID       string
	PriceAtPurchase int32
	CreateAt        time.Duration
	EditAt          time.Duration
}
