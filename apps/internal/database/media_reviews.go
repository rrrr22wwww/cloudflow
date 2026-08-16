package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/rrrr22wwww/cloudflow/graph/model"
)

// populateProductPreviewImage sets product.PreviewImage from the images
// table; a product without a preview keeps nil.
func populateProductPreviewImage(ctx context.Context, db *sql.DB, product *model.Product) error {
	if product == nil {
		return nil
	}

	image, err := GetProductPreviewImage(ctx, db, product.ID)
	if err != nil {
		return err
	}
	product.PreviewImage = image
	return nil
}

// SetProductPreviewImage replaces the product's preview image reference.
func SetProductPreviewImage(ctx context.Context, db *sql.DB, productID string, fileName string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin image transaction: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM images WHERE target_id = $1 AND is_preview = TRUE`, productID); err != nil {
		return fmt.Errorf("failed to clear previous preview image: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO images (id, target_id, file_name, is_preview, sorted_order)
		VALUES (gen_random_uuid(), $1, $2, TRUE, 0)
	`, productID, fileName); err != nil {
		return fmt.Errorf("failed to save preview image: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit preview image: %w", err)
	}

	return nil
}

// GetProductPreviewImage returns the preview file name, or nil when the
// product has no preview image.
func GetProductPreviewImage(ctx context.Context, db *sql.DB, productID string) (*string, error) {
	var fileName sql.NullString
	err := db.QueryRowContext(ctx, `
		SELECT file_name
		FROM images
		WHERE target_id = $1 AND is_preview = TRUE
		ORDER BY created_at DESC
		LIMIT 1
	`, productID).Scan(&fileName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get preview image: %w", err)
	}

	return nullStringPtr(fileName), nil
}

// UpsertSellerReview creates or updates a buyer's review for a specific
// product of a seller (one review per buyer/product pair).
func UpsertSellerReview(ctx context.Context, q dbRunner, sellerID, buyerID, productID string, rating int32, comment *string) error {
	_, err := q.ExecContext(ctx, `
		INSERT INTO seller_reviews (seller_id, buyer_id, product_id, rating, comment)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (seller_id, buyer_id, product_id) DO UPDATE
		SET rating = EXCLUDED.rating,
		    comment = EXCLUDED.comment,
		    updated_at = NOW()
	`, sellerID, buyerID, productID, rating, comment)
	if err != nil {
		return fmt.Errorf("failed to upsert seller review: %w", err)
	}
	return nil
}

// RefreshSellerRating recomputes users.rating as the rounded average of
// the seller's reviews.
func RefreshSellerRating(ctx context.Context, q dbRunner, sellerID string) error {
	_, err := q.ExecContext(ctx, `
		UPDATE users
		SET rating = COALESCE((
			SELECT ROUND(AVG(sr.rating))::INTEGER
			FROM seller_reviews sr
			WHERE sr.seller_id = $1
		), 0),
		    updated_at = NOW()
		WHERE id = $1
	`, sellerID)
	if err != nil {
		return fmt.Errorf("failed to refresh seller rating: %w", err)
	}
	return nil
}

// GetSellerReviews returns all reviews for a seller, newest first.
func GetSellerReviews(ctx context.Context, db *sql.DB, sellerID string) ([]*model.SellerReview, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, seller_id, buyer_id, product_id, rating, comment, created_at, updated_at
		FROM seller_reviews
		WHERE seller_id = $1
		ORDER BY updated_at DESC, created_at DESC
	`, sellerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get seller reviews: %w", err)
	}
	defer rows.Close()

	reviews := []*model.SellerReview{}
	for rows.Next() {
		review := &model.SellerReview{}
		var comment sql.NullString
		var createdAt sql.NullTime
		var updatedAt sql.NullTime
		if err := rows.Scan(
			&review.ID,
			&review.SellerID,
			&review.BuyerID,
			&review.ProductID,
			&review.Rating,
			&comment,
			&createdAt,
			&updatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan seller review: %w", err)
		}
		review.Comment = nullStringPtr(comment)
		review.CreatedAt = nullTimePtr(createdAt)
		review.UpdatedAt = nullTimePtr(updatedAt)
		reviews = append(reviews, review)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate seller reviews: %w", err)
	}

	return reviews, nil
}
