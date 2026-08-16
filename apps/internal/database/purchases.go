package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/rrrr22wwww/cloudflow/graph/model"
)

// TopUpUserBalance atomically adds a positive amount to the user's balance.
func TopUpUserBalance(ctx context.Context, db *sql.DB, userID string, amount float64) (*model.User, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be greater than zero")
	}

	user := &model.User{}
	row := db.QueryRowContext(ctx,
		`UPDATE users
		 SET balance = COALESCE(balance, 0) + $2,
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, name, email, img_user, role, rating, balance, created_at, updated_at`,
		userID, amount,
	)

	if err := scanUserRow(row, user); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("user: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("failed to top up balance: %w", err)
	}

	return user, nil
}

// GetPurchasedProducts returns products the buyer has successfully paid
// for (order status 200), newest first.
func GetPurchasedProducts(ctx context.Context, db *sql.DB, buyerID string) ([]*model.Product, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT p.id, p.seller_id, p.category_id, p.name, p.description, p.price, p.rating, p.status, p.created_at, p.updated_at
		FROM products p
		WHERE EXISTS (
			SELECT 1
			FROM order_items oi
			JOIN orders o ON o.id = oi.order_id
			WHERE oi.product_id = p.id
			  AND o.buyer_id = $1
			  AND o.status = 200
		)
		ORDER BY p.updated_at DESC
	`, buyerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get purchased products: %w", err)
	}
	defer rows.Close()

	products := make([]*model.Product, 0)
	for rows.Next() {
		product := &model.Product{}
		if err := scanProductRow(rows, product); err != nil {
			return nil, fmt.Errorf("failed to scan purchased product: %w", err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate purchased products: %w", err)
	}

	for _, product := range products {
		if err := attachProductExtras(ctx, db, product); err != nil {
			return nil, err
		}
	}

	return products, nil
}

// PurchaseProduct performs the whole purchase in one transaction:
//
//  1. lock buyer and product rows (SELECT ... FOR UPDATE) so concurrent
//     purchases cannot double-spend the balance or sell one server twice;
//  2. validate: not own product, product active, sufficient balance;
//  3. create the order (status 200) and its order item;
//  4. move money from buyer to seller;
//  5. record the buyer's review and refresh the seller's rating;
//  6. mark the product inactive (a server is sold exactly once).
//
// Any failure rolls the whole purchase back.
func PurchaseProduct(
	ctx context.Context,
	db *sql.DB,
	buyerID string,
	productID string,
	rating *int32,
	comment *string,
) (*model.Order, *model.Product, *model.User, error) {
	reviewRating := int32(5)
	if rating != nil {
		if *rating < 1 || *rating > 5 {
			return nil, nil, nil, fmt.Errorf("rating must be between 1 and 5")
		}
		reviewRating = *rating
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to begin purchase transaction: %w", err)
	}
	defer tx.Rollback()

	buyer := &model.User{}
	buyerRow := tx.QueryRowContext(ctx,
		`SELECT id, name, email, img_user, role, rating, balance, created_at, updated_at
		 FROM users
		 WHERE id = $1
		 FOR UPDATE`,
		buyerID,
	)
	if err := scanUserRow(buyerRow, buyer); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, nil, fmt.Errorf("buyer: %w", ErrNotFound)
		}
		return nil, nil, nil, fmt.Errorf("failed to load buyer: %w", err)
	}

	product := &model.Product{}
	productRow := tx.QueryRowContext(ctx,
		`SELECT id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at
		 FROM products
		 WHERE id = $1
		 FOR UPDATE`,
		productID,
	)
	if err := scanProductRow(productRow, product); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, nil, fmt.Errorf("product: %w", ErrNotFound)
		}
		return nil, nil, nil, fmt.Errorf("failed to load product: %w", err)
	}

	if product.SellerID == buyerID {
		return nil, nil, nil, fmt.Errorf("you cannot buy your own server")
	}

	if product.Status != nil && *product.Status != "active" {
		return nil, nil, nil, fmt.Errorf("product is not available for purchase")
	}

	buyerBalance := 0.0
	if buyer.Balance != nil {
		buyerBalance = *buyer.Balance
	}
	if buyerBalance < product.Price {
		return nil, nil, nil, fmt.Errorf("insufficient balance")
	}

	order := &model.Order{}
	orderRow := tx.QueryRowContext(ctx,
		`INSERT INTO orders (id, buyer_id, status, total_amount)
		 VALUES (gen_random_uuid(), $1, 200, $2)
		 RETURNING id, buyer_id, status, total_amount, created_at, updated_at`,
		buyerID, product.Price,
	)
	if err := scanOrderRow(orderRow, order); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to create order: %w", err)
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO order_items (id, order_id, price_at_purchase, seller_id, product_id, quantity)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, 1)`,
		order.ID, product.Price, product.SellerID, product.ID,
	); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to create order item: %w", err)
	}

	updatedBuyer := &model.User{}
	updatedBuyerRow := tx.QueryRowContext(ctx,
		`UPDATE users
		 SET balance = COALESCE(balance, 0) - $2,
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, name, email, img_user, role, rating, balance, created_at, updated_at`,
		buyerID, product.Price,
	)
	if err := scanUserRow(updatedBuyerRow, updatedBuyer); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to update buyer balance: %w", err)
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE users
		 SET balance = COALESCE(balance, 0) + $2,
		     updated_at = NOW()
		 WHERE id = $1`,
		product.SellerID, product.Price,
	); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to update seller balance: %w", err)
	}

	if err := UpsertSellerReview(ctx, tx, product.SellerID, buyerID, product.ID, reviewRating, normalizeOptionalComment(comment)); err != nil {
		return nil, nil, nil, err
	}
	if err := RefreshSellerRating(ctx, tx, product.SellerID); err != nil {
		return nil, nil, nil, err
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE products
		 SET status = 'inactive',
		     updated_at = NOW()
		 WHERE id = $1`,
		product.ID,
	); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to deactivate purchased product: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to commit purchase: %w", err)
	}

	updatedProduct, err := GetProductByID(ctx, db, product.ID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to reload purchased product: %w", err)
	}

	return order, updatedProduct, updatedBuyer, nil
}

// normalizeOptionalComment trims the comment and converts empty strings
// to nil.
func normalizeOptionalComment(comment *string) *string {
	if comment == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*comment)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}
