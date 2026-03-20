package domain

import (
	"time"

	"github.com/google/uuid"
)

type Users struct{}

type Order struct {
	Buyers Users
}

type Orders struct {
	ID           uuid.UUID
	BuyerID      uuid.UUID
	SellerID     uuid.UUID
	Select_order []uuid.UUID
	Status       int32
	TotalAmount  int32
	CreatedAt    time.Time
	EditedAt     time.Time
}

type Order_items struct {
	ID              uuid.UUID
	OrderID         uuid.UUID
	ProductID       uuid.UUID
	PriceAtPurchase int32
	CreatedAt       time.Time
	EditedAt        time.Time
}

func NewOrder(BuyerID, SellerID uuid.UUID, TotalAmount int32) (*Orders, error) {
	if TotalAmount < 0 {
		return nil, ErrAmount
	}
	id, err := uuid.NewV7()
	if err != nil {
		return nil, ErrGenUUID
	}
	return &Orders{
		ID:           id,
		BuyerID:      BuyerID,
		SellerID:     SellerID,
		Select_order: nil,
		Status:       300,
		TotalAmount:  TotalAmount,
		CreatedAt:    time.Now(),
		EditedAt:     time.Now(),
	}, nil
}
