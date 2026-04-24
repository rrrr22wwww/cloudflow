package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/rrrr22wwww.com/cloudflow/graph/model"
)

func populateProductPreviewImage(r *sql.DB, ctx context.Context, product *model.Product) error {
	if product == nil {
		return nil
	}

	image, err := GetProductPreviewImage(r, ctx, product.ID)
	if err != nil {
		return err
	}
	product.PreviewImage = image
	return nil
}

func ensureImagesTable(r *sql.DB, ctx context.Context) error {
	_, err := r.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS images (
			id UUID PRIMARY KEY,
			target_id UUID,
			file_name VARCHAR(255) NOT NULL,
			is_preview BOOLEAN DEFAULT FALSE,
			sorted_order INTEGER DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			FOREIGN KEY (target_id) REFERENCES products(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to ensure images table: %w", err)
	}
	return nil
}

func SetProductPreviewImage(r *sql.DB, ctx context.Context, productID string, fileName string) error {
	if err := ensureImagesTable(r, ctx); err != nil {
		return err
	}

	tx, err := r.BeginTx(ctx, &sql.TxOptions{})
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

func GetProductPreviewImage(r *sql.DB, ctx context.Context, productID string) (*string, error) {
	if err := ensureImagesTable(r, ctx); err != nil {
		return nil, err
	}

	var fileName sql.NullString
	err := r.QueryRowContext(ctx, `
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

func ensureSellerReviewsTable(r *sql.DB, ctx context.Context) error {
	_, err := r.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS seller_reviews (
			id SERIAL PRIMARY KEY,
			seller_id UUID NOT NULL,
			buyer_id UUID NOT NULL,
			product_id UUID NOT NULL,
			rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
			comment TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
			UNIQUE (seller_id, buyer_id, product_id)
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to ensure seller_reviews table: %w", err)
	}
	return nil
}

func UpsertSellerReview(r dbRunner, ctx context.Context, sellerID, buyerID, productID string, rating int32, comment *string) error {
	if sqlDB, ok := r.(*sql.DB); ok {
		if err := ensureSellerReviewsTable(sqlDB, ctx); err != nil {
			return err
		}
	}

	if tx, ok := r.(*sql.Tx); ok {
		_, err := tx.ExecContext(ctx, `
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

	_, err := r.ExecContext(ctx, `
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

func RefreshSellerRating(r dbRunner, ctx context.Context, sellerID string) error {
	_, err := r.ExecContext(ctx, `
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

func GetSellerReviews(r *sql.DB, ctx context.Context, sellerID string) ([]*model.SellerReview, error) {
	if err := ensureSellerReviewsTable(r, ctx); err != nil {
		return nil, err
	}

	rows, err := r.QueryContext(ctx, `
		SELECT id, seller_id, buyer_id, product_id, rating, comment, created_at, updated_at
		FROM seller_reviews
		WHERE seller_id = $1
		ORDER BY updated_at DESC, created_at DESC
	`, sellerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get seller reviews: %w", err)
	}
	defer rows.Close()

	reviews := make([]*model.SellerReview, 0)
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

	return reviews, nil
}
