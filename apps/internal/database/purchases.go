package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/rrrr22wwww.com/cloudflow/graph/model"
)

func TopUpUserBalance(r *sql.DB, ctx context.Context, userID string, amount float64) (*model.User, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be greater than zero")
	}

	user := &model.User{}
	row := r.QueryRowContext(ctx,
		`UPDATE users
		 SET balance = COALESCE(balance, 0) + $2,
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, name, email, img_user, role, rating, balance, created_at, updated_at`,
		userID, amount,
	)

	if err := scanUserRow(row, user); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to top up balance: %w", err)
	}

	return user, nil
}

func GetPurchasedProducts(r *sql.DB, ctx context.Context, buyerID string) ([]*model.Product, error) {
	hasTagsColumn, err := productsHaveTagsColumn(r, ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect products schema: %w", err)
	}
	useJoinTags := false
	if !hasTagsColumn {
		useJoinTags, err = productTagsJoinAvailable(r, ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to inspect product tags schema: %w", err)
		}
	}

	query := `SELECT p.id, p.seller_id, p.category_id, p.name, p.description, p.price, p.rating, p.status, p.created_at, p.updated_at
		FROM products p
		WHERE EXISTS (
			SELECT 1
			FROM order_items oi
			JOIN orders o ON o.id = oi.order_id
			WHERE oi.product_id = p.id
			  AND o.buyer_id = $1
			  AND o.status = 200
		)
		ORDER BY p.updated_at DESC`
	if hasTagsColumn {
		query = `SELECT p.id, p.seller_id, p.category_id, p.name, p.description, p.price, p.rating, p.status, p.tags, p.created_at, p.updated_at
			FROM products p
			WHERE EXISTS (
				SELECT 1
				FROM order_items oi
				JOIN orders o ON o.id = oi.order_id
				WHERE oi.product_id = p.id
				  AND o.buyer_id = $1
				  AND o.status = 200
			)
			ORDER BY p.updated_at DESC`
	}

	rows, err := r.QueryContext(ctx, query, buyerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get purchased products: %w", err)
	}
	defer rows.Close()

	products := make([]*model.Product, 0)
	for rows.Next() {
		product := &model.Product{}
		if err := scanProductRow(rows, product, hasTagsColumn); err != nil {
			return nil, fmt.Errorf("failed to scan purchased product: %w", err)
		}
		if useJoinTags {
			tags, err := loadProductTags(r, ctx, product.ID)
			if err != nil {
				return nil, err
			}
			product.Tags = stringSliceToPointers(tags)
		}
		if err := populateProductPreviewImage(r, ctx, product); err != nil {
			return nil, err
		}
		products = append(products, product)
	}

	return products, nil
}

func PurchaseProduct(
	r *sql.DB,
	ctx context.Context,
	buyerID string,
	productID string,
	rating *int32,
	comment *string,
) (*model.Order, *model.Product, *model.User, error) {
	hasTagsColumn, err := productsHaveTagsColumn(r, ctx)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to inspect products schema: %w", err)
	}
	useJoinTags := false
	if !hasTagsColumn {
		useJoinTags, err = productTagsJoinAvailable(r, ctx)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to inspect product tags schema: %w", err)
		}
	}

	tx, err := r.BeginTx(ctx, &sql.TxOptions{})
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
			return nil, nil, nil, fmt.Errorf("buyer not found")
		}
		return nil, nil, nil, fmt.Errorf("failed to load buyer: %w", err)
	}

	product := &model.Product{}
	var productRow *sql.Row
	if hasTagsColumn {
		productRow = tx.QueryRowContext(ctx,
			`SELECT id, seller_id, category_id, name, description, price, rating, status, tags, created_at, updated_at
			 FROM products
			 WHERE id = $1
			 FOR UPDATE`,
			productID,
		)
	} else {
		productRow = tx.QueryRowContext(ctx,
			`SELECT id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at
			 FROM products
			 WHERE id = $1
			 FOR UPDATE`,
			productID,
		)
	}

	if err := scanProductRow(productRow, product, hasTagsColumn); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, nil, fmt.Errorf("product not found")
		}
		return nil, nil, nil, fmt.Errorf("failed to load product: %w", err)
	}
	if useJoinTags {
		tags, err := loadProductTags(tx, ctx, product.ID)
		if err != nil {
			return nil, nil, nil, err
		}
		product.Tags = stringSliceToPointers(tags)
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

	trimmedComment := normalizeOptionalComment(comment)
	reviewRating := int32(5)
	if rating != nil {
		if *rating < 1 || *rating > 5 {
			return nil, nil, nil, fmt.Errorf("rating must be between 1 and 5")
		}
		reviewRating = *rating
	}

	if err := UpsertSellerReview(tx, ctx, product.SellerID, buyerID, product.ID, reviewRating, trimmedComment); err != nil {
		return nil, nil, nil, err
	}
	if err := RefreshSellerRating(tx, ctx, product.SellerID); err != nil {
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

	updatedProduct, err := GetProductByID(r, ctx, product.ID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to reload purchased product: %w", err)
	}

	return order, updatedProduct, updatedBuyer, nil
}
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
