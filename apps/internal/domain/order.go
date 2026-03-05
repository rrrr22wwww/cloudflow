package domain

import (
	"time"

	"github.com/google/uuid"
)

type Orders struct {
	ID          uuid.UUID
	ByerID      uuid.UUID
	SellerID    uuid.UUID
	Satus       int32
	TotalAmount int32
	CreateAt    time.Duration
	EditAt      time.Duration
}

type Order_items struct {
	ID              uuid.UUID
	OrderID         string
	ProductID       string
	PriceAtPurchase int32
	CreateAt        time.Duration
	EditAt          time.Duration
}

func NewOrder(ByerID, SellerID uuid.UUID, TotalAmount int32) (*Orders, error) {
	if TotalAmount < 0 {
		return nil, ErrAmount
	}
	id, _ := uuid.NewV7()
	return &Orders{id, ByerID, SellerID, 300, TotalAmount, time.Duration(time.Now().Unix()), time.Duration(time.Now().Unix())}, nil
}
