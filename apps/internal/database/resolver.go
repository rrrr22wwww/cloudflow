// Package database contains all SQL access for the application.
//
// Conventions:
//   - context.Context is always the first parameter, the connection (or
//     transaction) the second.
//   - The schema is owned exclusively by the migrations in
//     lib/migration/postgres; this package never creates or inspects
//     tables at runtime.
//   - Product tags are normalized (tags + product_tag join table).
package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/rrrr22wwww/cloudflow/graph/model"
)

// ErrNotFound is returned when a requested row does not exist.
var ErrNotFound = errors.New("not found")

type rowScanner interface {
	Scan(dest ...any) error
}

// CreateUser inserts a new user and fills the given model from the
// returned row. The password must already be hashed by the caller.
func CreateUser(ctx context.Context, db *sql.DB, user *model.User, name, email, imgUser, passwordHash *string) error {
	row := db.QueryRowContext(ctx,
		`INSERT INTO users (id, name, email, img_user, password, role, rating, balance)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'User', 0, 0)
           RETURNING id, name, email, img_user, role, rating, balance, created_at, updated_at`,
		name, email, imgUser, passwordHash,
	)

	if err := scanUserRow(row, user); err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetUserCredentialsByEmail returns the user id and stored password hash
// for the given email, or ErrNotFound.
func GetUserCredentialsByEmail(ctx context.Context, db *sql.DB, email string) (string, string, error) {
	var userID string
	var hash string

	err := db.QueryRowContext(ctx,
		`SELECT id, password FROM users WHERE email = $1`,
		email,
	).Scan(&userID, &hash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", "", ErrNotFound
		}
		return "", "", fmt.Errorf("failed to get user credentials: %w", err)
	}

	return userID, hash, nil
}

func CreateUserSession(ctx context.Context, db *sql.DB, userID, token string, expiresAt time.Time) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO user_sessions (user_id, token, expires_at)
		 VALUES ($1, $2, $3)`,
		userID, token, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create user session: %w", err)
	}

	return nil
}

func DeleteUserSessionByToken(ctx context.Context, db *sql.DB, token string) (bool, error) {
	res, err := db.ExecContext(ctx,
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

func DeleteUserSessionsByUserID(ctx context.Context, db *sql.DB, userID string) error {
	_, err := db.ExecContext(ctx, `DELETE FROM user_sessions WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user sessions: %w", err)
	}
	return nil
}

// GetUserSessionByToken returns the user id, role and expiry for a
// non-expired session token.
func GetUserSessionByToken(ctx context.Context, db *sql.DB, token string) (string, string, time.Time, error) {
	var userID string
	var role string
	var expiresAt time.Time

	err := db.QueryRowContext(ctx,
		`SELECT us.user_id, u.role, us.expires_at
		 FROM user_sessions us
		 JOIN users u ON u.id = us.user_id
		 WHERE us.token = $1 AND us.expires_at > NOW()`,
		token,
	).Scan(&userID, &role, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", "", time.Time{}, fmt.Errorf("session not found or expired: %w", ErrNotFound)
		}
		return "", "", time.Time{}, fmt.Errorf("failed to get session: %w", err)
	}

	return userID, role, expiresAt, nil
}

// CreateProduct inserts a product and attaches its tags in a single
// transaction, then fills the given model.
func CreateProduct(
	ctx context.Context,
	db *sql.DB,
	product *model.Product,
	sellerID string,
	name, description string,
	price float64,
	categoryID *int32,
	rating int32,
	tags []string,
) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin create product transaction: %w", err)
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(ctx,
		`INSERT INTO products (id, seller_id, category_id, name, description, price, rating, status)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'active')
		 RETURNING id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at`,
		sellerID, categoryID, name, description, price, rating,
	)
	if err := scanProductRow(row, product); err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}

	if err := replaceProductTags(ctx, tx, product.ID, tags); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit create product: %w", err)
	}

	product.Tags = stringSliceToPointers(normalizedTags(tags))
	return nil
}

// UpdateProduct applies a partial update; nil fields keep their current
// values. Tags are replaced only when updateTags is true.
func UpdateProduct(
	ctx context.Context,
	db *sql.DB,
	id string,
	categoryID *int32,
	name *string,
	description *string,
	price *float64,
	rating *int32,
	status *string,
	tags []string,
	updateTags bool,
) (*model.Product, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin update product transaction: %w", err)
	}
	defer tx.Rollback()

	product := &model.Product{}
	row := tx.QueryRowContext(ctx,
		`UPDATE products
		 SET category_id = COALESCE($2, category_id),
		     name = COALESCE($3, name),
		     description = COALESCE($4, description),
		     price = COALESCE($5, price),
		     rating = COALESCE($6, rating),
		     status = COALESCE($7, status),
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at`,
		id, categoryID, name, description, price, rating, status,
	)
	if err := scanProductRow(row, product); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("product: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("failed to update product: %w", err)
	}

	if updateTags {
		if err := replaceProductTags(ctx, tx, id, tags); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit update product: %w", err)
	}

	if updateTags {
		product.Tags = stringSliceToPointers(normalizedTags(tags))
	} else {
		productTags, err := loadProductTags(ctx, db, id)
		if err != nil {
			return nil, err
		}
		product.Tags = stringSliceToPointers(productTags)
	}

	return product, nil
}

func DeleteProduct(ctx context.Context, db *sql.DB, id string) (bool, error) {
	res, err := db.ExecContext(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("failed to delete product: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return rowsAffected > 0, nil
}

func GetProductByID(ctx context.Context, db *sql.DB, id string) (*model.Product, error) {
	product := &model.Product{}
	row := db.QueryRowContext(ctx,
		`SELECT id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at
		 FROM products
		 WHERE id = $1`,
		id,
	)
	if err := scanProductRow(row, product); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("product: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
	}

	if err := attachProductExtras(ctx, db, product); err != nil {
		return nil, err
	}

	return product, nil
}

// GetProducts returns products filtered by the non-nil arguments.
func GetProducts(ctx context.Context, db *sql.DB, name *string, id *string, sellerID *string) ([]*model.Product, error) {
	params := []Param{
		{Column: "name", Value: name},
		{Column: "id", Value: id},
		{Column: "seller_id", Value: sellerID},
	}
	query := `SELECT id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at FROM products WHERE 1=1`

	builtQuery, args := buildEqualityQuery(query, params)
	rows, err := db.QueryContext(ctx, builtQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get products: %w", err)
	}
	defer rows.Close()

	products := []*model.Product{}
	for rows.Next() {
		product := &model.Product{}
		if err := scanProductRow(rows, product); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate products: %w", err)
	}

	for _, product := range products {
		if err := attachProductExtras(ctx, db, product); err != nil {
			return nil, err
		}
	}

	return products, nil
}

// attachProductExtras loads tags and the preview image for a product.
func attachProductExtras(ctx context.Context, db *sql.DB, product *model.Product) error {
	tags, err := loadProductTags(ctx, db, product.ID)
	if err != nil {
		return err
	}
	product.Tags = stringSliceToPointers(tags)

	return populateProductPreviewImage(ctx, db, product)
}

func GetUsers(ctx context.Context, db *sql.DB, name *string, email *string, id *string) ([]*model.User, error) {
	params := []Param{
		{Column: "name", Value: name},
		{Column: "id", Value: id},
		{Column: "email", Value: email},
	}
	query := `SELECT id, name, email, img_user, role, rating, balance, created_at, updated_at FROM users WHERE 1=1`

	builtQuery, args := buildEqualityQuery(query, params)
	rows, err := db.QueryContext(ctx, builtQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	defer rows.Close()

	users := []*model.User{}
	for rows.Next() {
		user := &model.User{}
		if err := scanUserRow(rows, user); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate users: %w", err)
	}
	return users, nil
}

func GetOrders(ctx context.Context, db *sql.DB, buyerID *string, status *string) ([]*model.Order, error) {
	params := []Param{
		{Column: "buyer_id", Value: buyerID},
		{Column: "status", Value: status},
	}
	query := `SELECT id, buyer_id, status, total_amount, created_at, updated_at FROM orders WHERE 1=1`

	builtQuery, args := buildEqualityQuery(query, params)
	rows, err := db.QueryContext(ctx, builtQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders: %w", err)
	}
	defer rows.Close()

	orders := []*model.Order{}
	for rows.Next() {
		order := &model.Order{}
		if err := scanOrderRow(rows, order); err != nil {
			return nil, fmt.Errorf("failed to scan order: %w", err)
		}
		orders = append(orders, order)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate orders: %w", err)
	}

	return orders, nil
}

// UpdateUser applies a partial update; nil fields keep their current values.
func UpdateUser(
	ctx context.Context,
	db *sql.DB,
	id string,
	name *string,
	email *string,
	imgUser *string,
	role *string,
	rating *int32,
	balance *float64,
) (*model.User, error) {
	user := &model.User{}
	row := db.QueryRowContext(ctx,
		`UPDATE users
		 SET name = COALESCE($2, name),
		     email = COALESCE($3, email),
		     img_user = COALESCE($4, img_user),
		     role = COALESCE($5, role),
		     rating = COALESCE($6, rating),
		     balance = COALESCE($7, balance),
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, name, email, img_user, role, rating, balance, created_at, updated_at`,
		id, name, email, imgUser, role, rating, balance,
	)

	if err := scanUserRow(row, user); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("user: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

// DeleteUser removes the user together with their sessions.
func DeleteUser(ctx context.Context, db *sql.DB, id string) (bool, error) {
	if err := DeleteUserSessionsByUserID(ctx, db, id); err != nil {
		return false, err
	}

	res, err := db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return rowsAffected > 0, nil
}

func CreateCategory(ctx context.Context, db *sql.DB, category *model.Category, name string, parentID *int32) error {
	row := db.QueryRowContext(ctx,
		`INSERT INTO categories (name, parent_id)
		 VALUES ($1, $2)
		 RETURNING id, name, parent_id`,
		name, parentID,
	)

	if err := scanCategoryRow(row, category); err != nil {
		return fmt.Errorf("failed to create category: %w", err)
	}
	return nil
}

func UpdateCategory(ctx context.Context, db *sql.DB, id int32, name *string, parentID *int32) (*model.Category, error) {
	category := &model.Category{}
	row := db.QueryRowContext(ctx,
		`UPDATE categories
		 SET name = COALESCE($2, name),
		     parent_id = $3
		 WHERE id = $1
		 RETURNING id, name, parent_id`,
		id, name, parentID,
	)

	if err := scanCategoryRow(row, category); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("category: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("failed to update category: %w", err)
	}
	return category, nil
}

func DeleteCategory(ctx context.Context, db *sql.DB, id int32) (bool, error) {
	res, err := db.ExecContext(ctx, `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("failed to delete category: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return rowsAffected > 0, nil
}

func GetCategories(ctx context.Context, db *sql.DB) ([]*model.Category, error) {
	rows, err := db.QueryContext(ctx, `SELECT id, name, parent_id FROM categories ORDER BY id ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}
	defer rows.Close()

	categories := []*model.Category{}
	for rows.Next() {
		category := &model.Category{}
		if err := scanCategoryRow(rows, category); err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}
		categories = append(categories, category)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate categories: %w", err)
	}

	return categories, nil
}

// ---------------------------------------------------------------------------
// Row scanning helpers
// ---------------------------------------------------------------------------

func scanUserRow(scanner rowScanner, user *model.User) error {
	var imgUser sql.NullString
	var role sql.NullString
	var rating sql.NullInt32
	var balance sql.NullFloat64
	var createdAt sql.NullTime
	var updatedAt sql.NullTime

	err := scanner.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&imgUser,
		&role,
		&rating,
		&balance,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return err
	}

	user.ImgUser = nullStringPtr(imgUser)
	user.Role = nullStringPtr(role)
	user.Rating = nullInt32Ptr(rating)
	user.Balance = nullFloat64Ptr(balance)
	user.CreatedAt = nullTimePtr(createdAt)
	user.UpdatedAt = nullTimePtr(updatedAt)
	return nil
}

func scanProductRow(scanner rowScanner, product *model.Product) error {
	var categoryID sql.NullInt32
	var rating sql.NullInt32
	var status sql.NullString
	var createdAt time.Time
	var updatedAt time.Time

	err := scanner.Scan(
		&product.ID,
		&product.SellerID,
		&categoryID,
		&product.Name,
		&product.Description,
		&product.Price,
		&rating,
		&status,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return err
	}

	product.CategoryID = nullInt32Ptr(categoryID)
	product.Rating = nullInt32Ptr(rating)
	product.Status = nullStringPtr(status)
	product.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	product.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return nil
}

func scanCategoryRow(scanner rowScanner, category *model.Category) error {
	var parentID sql.NullInt32

	if err := scanner.Scan(&category.ID, &category.Name, &parentID); err != nil {
		return err
	}

	category.ParentID = nullInt32Ptr(parentID)
	return nil
}

func scanOrderRow(scanner rowScanner, order *model.Order) error {
	// orders.status is a SMALLINT holding HTTP-like codes (see the orders
	// migration); the GraphQL schema exposes it as a string.
	var status sql.NullInt64
	var createdAt sql.NullTime
	var updatedAt sql.NullTime

	err := scanner.Scan(
		&order.ID,
		&order.BuyerID,
		&status,
		&order.TotalAmount,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return err
	}

	if status.Valid {
		order.Status = fmt.Sprintf("%d", status.Int64)
	}
	order.CreatedAt = nullTimePtr(createdAt)
	order.UpdatedAt = nullTimePtr(updatedAt)
	return nil
}

// ---------------------------------------------------------------------------
// sql.Null* -> pointer conversions
// ---------------------------------------------------------------------------

func nullStringPtr(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	return &value.String
}

func nullInt32Ptr(value sql.NullInt32) *int32 {
	if !value.Valid {
		return nil
	}
	return &value.Int32
}

func nullFloat64Ptr(value sql.NullFloat64) *float64 {
	if !value.Valid {
		return nil
	}
	return &value.Float64
}

func nullTimePtr(value sql.NullTime) *string {
	if !value.Valid {
		return nil
	}
	formatted := value.Time.UTC().Format(time.RFC3339)
	return &formatted
}

func stringSliceToPointers(values []string) []*string {
	if len(values) == 0 {
		return nil
	}

	items := make([]*string, 0, len(values))
	for _, value := range values {
		current := value
		items = append(items, &current)
	}
	return items
}
