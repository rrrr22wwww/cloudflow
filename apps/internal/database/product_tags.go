package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type dbRunner interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func productTagsJoinAvailable(r *sql.DB, ctx context.Context) (bool, error) {
	var exists bool
	err := r.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public'
			  AND table_name = 'product_tag'
		) AND EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public'
			  AND table_name = 'tags'
		)
	`).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func loadProductTags(r dbRunner, ctx context.Context, productID string) ([]string, error) {
	rows, err := r.QueryContext(ctx, `
		SELECT t.name
		FROM product_tag pt
		JOIN tags t ON t.id = pt.tag_id
		WHERE pt.product_id = $1
		ORDER BY t.name ASC
	`, productID)
	if err != nil {
		return nil, fmt.Errorf("failed to load product tags: %w", err)
	}
	defer rows.Close()

	tags := make([]string, 0)
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("failed to scan product tag: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func replaceProductTags(r dbRunner, ctx context.Context, productID string, tags []string) error {
	if _, err := r.ExecContext(ctx, `DELETE FROM product_tag WHERE product_id = $1`, productID); err != nil {
		return fmt.Errorf("failed to clear product tags: %w", err)
	}

	for _, tag := range normalizedTags(tags) {
		var tagID int32
		row := r.QueryRowContext(ctx,
			`INSERT INTO tags (name)
			 VALUES ($1)
			 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
			 RETURNING id`,
			tag,
		)
		if err := row.Scan(&tagID); err != nil {
			return fmt.Errorf("failed to upsert tag: %w", err)
		}

		if _, err := r.ExecContext(ctx,
			`INSERT INTO product_tag (product_id, tag_id)
			 VALUES ($1, $2)
			 ON CONFLICT (product_id, tag_id) DO NOTHING`,
			productID, tagID,
		); err != nil {
			return fmt.Errorf("failed to attach tag to product: %w", err)
		}
	}

	return nil
}

func normalizedTags(tags []string) []string {
	if len(tags) == 0 {
		return nil
	}

	seen := make(map[string]struct{}, len(tags))
	normalized := make([]string, 0, len(tags))
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	return normalized
}
