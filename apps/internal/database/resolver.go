package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/rrrr22wwww.com/cloudflow/graph/model"
)

func CreatUser(r *sql.DB, ctx context.Context, user *model.User, name *string, email *string, imgUser *string, password *string) error {
	err := r.QueryRowContext(ctx,
		`INSERT INTO users (id, name, email, img_user, password, role, rating, balance)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'User',0,0)
           RETURNING id, name, email, img_user, role, rating, balance`,
		name, email, imgUser, password,
	).Scan(&user.ID, &user.Name, &user.Email, &user.ImgUser, &user.Role, &user.Rating, &user.Balance)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func GetUserCredentialsByEmail(r *sql.DB, ctx context.Context, email string) (string, string, error) {
	var userID string
	var hash string

	err := r.QueryRowContext(ctx,
		`SELECT id, password FROM users WHERE email = $1`,
		email,
	).Scan(&userID, &hash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", "", sql.ErrNoRows
		}

		return "", "", fmt.Errorf("failed to get user credentials: %w", err)
	}

	return userID, hash, nil
}

func CreateUserSession(r *sql.DB, ctx context.Context, userID, token string, expiresAt time.Time) error {
	_, err := r.ExecContext(ctx,
		`INSERT INTO user_sessions (user_id, token, expires_at)
		 VALUES ($1, $2, $3)`,
		userID, token, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create user session: %w", err)
	}

	return nil
}

func DeleteUserSessionByToken(r *sql.DB, ctx context.Context, token string) (bool, error) {
	res, err := r.ExecContext(ctx,
		`DELETE FROM user_sessions WHERE token = $1`,
		token,
	)
	if err != nil {
		return false, fmt.Errorf("failed to delete user session: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return rowsAffected > 0, nil
}

func CreateProduct(
	r *sql.DB,
	product *model.Product,
	ctx context.Context,
	sellerID *string,
	name, description *string,
	price, categoryID *int32,
	rating *float64,
) error {

	err := r.QueryRowContext(ctx,
		`INSERT INTO products (id, seller_id, category_id, name, description, price, rating, status)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'active')
		 RETURNING id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at`,
		sellerID, categoryID, name, description, price, rating,
	).Scan(
		&product.ID, &product.SellerID, &product.CategoryID, &product.Name,
		&product.Description, &product.Price, &product.Rating, &product.Status,
		&product.CreatedAt, &product.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}

	return nil
}

func CreateCategory(r *sql.DB, ctx context.Context, category *model.Category, name string, parentID *int32) error {
	err := r.QueryRowContext(ctx,
		`INSERT INTO categories (name, parent_id)
	 VALUES ($1, $2)
	 RETURNING *`,
		name, parentID,
	).Scan(&category.ID, &category.Name, &category.ParentID)
	if err != nil {
		return fmt.Errorf("failed to create category: %w", err)
	}
	return nil
}

func GetUsers(r *sql.DB, ctx context.Context, name *string, email *string, id *string) ([]*model.User, error) {
	users := []*model.User{}
	params := []Param{
		{"name", name},
		{"id", id},
		{"email", email},
	}
	query := "SELECT id, name, email, img_user, role, rating, balance,created_at FROM users WHERE 1=1"

	myQuery, args := buildEqualityQuery(&query, &params, "AND")

	rows, err := r.QueryContext(ctx, myQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		user := &model.User{}
		err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.ImgUser, &user.Role, &user.Rating, &user.Balance, &user.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}
	return users, nil
}

func GetProducts(r *sql.DB, ctx context.Context, name *string, id *string, sellerID *string) ([]*model.Product, error) {
	products := []*model.Product{}
	params := []Param{
		{"name", name},
		{"id", id},
		{"seller_id", sellerID},
	}

	query := "SELECT * FROM products WHERE 1=1"
	myQuery, args := buildEqualityQuery(&query, &params, "AND")

	if len(args) == 0 {
		myQuery = query
	}
	rows, err := r.QueryContext(ctx, myQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get products: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		product := &model.Product{}
		err := rows.Scan(
			&product.ID, &product.SellerID, &product.Name, &product.Description,
			&product.Price, &product.Rating, &product.Tags, &product.CreatedAt, &product.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, product)
	}
	return products, nil
}
