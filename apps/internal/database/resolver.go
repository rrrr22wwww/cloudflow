package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/rrrr22wwww.com/cloudflow/graph/model"
)

type rowScanner interface {
	Scan(dest ...any) error
}

func CreatUser(r *sql.DB, ctx context.Context, user *model.User, name *string, email *string, imgUser *string, password *string) error {
	row := r.QueryRowContext(ctx,
		`INSERT INTO users (id, name, email, img_user, password, role, rating, balance)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'User', 0, 0)
           RETURNING id, name, email, img_user, role, rating, balance, created_at, updated_at`,
		name, email, imgUser, password,
	)

	if err := scanUserRow(row, user); err != nil {
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

func DeleteUserSessionsByUserID(r *sql.DB, ctx context.Context, userID string) error {
	_, err := r.ExecContext(ctx, `DELETE FROM user_sessions WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user sessions: %w", err)
	}
	return nil
}

func CreateProduct(
	r *sql.DB,
	product *model.Product,
	ctx context.Context,
	sellerID string,
	name, description string,
	price float64,
	categoryID *int32,
	rating int32,
	tags []string,
) error {
	hasTagsColumn, err := productsHaveTagsColumn(r, ctx)
	if err != nil {
		return fmt.Errorf("failed to inspect products schema: %w", err)
	}
	useJoinTags := false
	if !hasTagsColumn {
		useJoinTags, err = productTagsJoinAvailable(r, ctx)
		if err != nil {
			return fmt.Errorf("failed to inspect product tags schema: %w", err)
		}
	}

	var row *sql.Row
	if hasTagsColumn {
		row = r.QueryRowContext(ctx,
			`INSERT INTO products (id, seller_id, category_id, name, description, price, rating, status, tags)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'active', $7)
			 RETURNING id, seller_id, category_id, name, description, price, rating, status, tags, created_at, updated_at`,
			sellerID, categoryID, name, description, price, rating, tags,
		)
	} else {
		row = r.QueryRowContext(ctx,
			`INSERT INTO products (id, seller_id, category_id, name, description, price, rating, status)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'active')
			 RETURNING id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at`,
			sellerID, categoryID, name, description, price, rating,
		)
	}

	if err := scanProductRow(row, product, hasTagsColumn); err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}

	if useJoinTags {
		if err := replaceProductTags(r, ctx, product.ID, tags); err != nil {
			return err
		}
		product.Tags = stringSliceToPointers(normalizedTags(tags))
	}

	return nil
}

func UpdateProduct(
	r *sql.DB,
	ctx context.Context,
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

	var tagsValue any
	if updateTags {
		tagsValue = tags
	}

	product := &model.Product{}
	var row *sql.Row
	if hasTagsColumn {
		row = r.QueryRowContext(ctx,
			`UPDATE products
			 SET category_id = COALESCE($2, category_id),
			     name = COALESCE($3, name),
			     description = COALESCE($4, description),
			     price = COALESCE($5, price),
			     rating = COALESCE($6, rating),
			     status = COALESCE($7, status),
			     tags = COALESCE($8, tags),
			     updated_at = NOW()
			 WHERE id = $1
			 RETURNING id, seller_id, category_id, name, description, price, rating, status, tags, created_at, updated_at`,
			id, categoryID, name, description, price, rating, status, tagsValue,
		)
	} else {
		row = r.QueryRowContext(ctx,
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
	}

	if err := scanProductRow(row, product, hasTagsColumn); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("product not found")
		}
		return nil, fmt.Errorf("failed to update product: %w", err)
	}

	if useJoinTags && updateTags {
		if err := replaceProductTags(r, ctx, id, tags); err != nil {
			return nil, err
		}
		product.Tags = stringSliceToPointers(normalizedTags(tags))
	} else if useJoinTags {
		productTags, err := loadProductTags(r, ctx, id)
		if err != nil {
			return nil, err
		}
		product.Tags = stringSliceToPointers(productTags)
	}

	return product, nil
}

func DeleteProduct(r *sql.DB, ctx context.Context, id string) (bool, error) {
	res, err := r.ExecContext(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("failed to delete product: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return rowsAffected > 0, nil
}

func GetProductByID(r *sql.DB, ctx context.Context, id string) (*model.Product, error) {
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

	product := &model.Product{}
	var row *sql.Row
	if hasTagsColumn {
		row = r.QueryRowContext(ctx,
			`SELECT id, seller_id, category_id, name, description, price, rating, status, tags, created_at, updated_at
			 FROM products
			 WHERE id = $1`,
			id,
		)
	} else {
		row = r.QueryRowContext(ctx,
			`SELECT id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at
			 FROM products
			 WHERE id = $1`,
			id,
		)
	}

	if err := scanProductRow(row, product, hasTagsColumn); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("product not found")
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
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

	return product, nil
}

func GetUserSessionByToken(r *sql.DB, ctx context.Context, token string) (string, string, time.Time, error) {
	var userID string
	var role string
	var expiresAt time.Time

	err := r.QueryRowContext(ctx,
		`SELECT us.user_id, u.role, us.expires_at
		 FROM user_sessions us
		 JOIN users u ON u.id = us.user_id
		 WHERE us.token = $1 AND us.expires_at > NOW()`,
		token,
	).Scan(&userID, &role, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", "", time.Time{}, fmt.Errorf("session not found or expired")
		}
		return "", "", time.Time{}, fmt.Errorf("failed to get session: %w", err)
	}

	return userID, role, expiresAt, nil
}

func CreateCategory(r *sql.DB, ctx context.Context, category *model.Category, name string, parentID *int32) error {
	row := r.QueryRowContext(ctx,
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

func UpdateCategory(r *sql.DB, ctx context.Context, id int32, name *string, parentID *int32) (*model.Category, error) {
	category := &model.Category{}
	row := r.QueryRowContext(ctx,
		`UPDATE categories
		 SET name = COALESCE($2, name),
		     parent_id = $3
		 WHERE id = $1
		 RETURNING id, name, parent_id`,
		id, name, parentID,
	)

	if err := scanCategoryRow(row, category); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("category not found")
		}
		return nil, fmt.Errorf("failed to update category: %w", err)
	}
	return category, nil
}

func DeleteCategory(r *sql.DB, ctx context.Context, id int32) (bool, error) {
	res, err := r.ExecContext(ctx, `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("failed to delete category: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return rowsAffected > 0, nil
}

func GetCategories(r *sql.DB, ctx context.Context) ([]*model.Category, error) {
	rows, err := r.QueryContext(ctx, `SELECT id, name, parent_id FROM categories ORDER BY id ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}
	defer rows.Close()

	categories := make([]*model.Category, 0)
	for rows.Next() {
		category := &model.Category{}
		if err := scanCategoryRow(rows, category); err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}
		categories = append(categories, category)
	}

	return categories, nil
}

func GetProducts(r *sql.DB, ctx context.Context, name *string, id *string, sellerID *string) ([]*model.Product, error) {
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

	products := []*model.Product{}
	params := []Param{
		{Column: "name", Value: name},
		{Column: "id", Value: id},
		{Column: "seller_id", Value: sellerID},
	}
	query := `SELECT id, seller_id, category_id, name, description, price, rating, status, created_at, updated_at FROM products WHERE 1=1`
	if hasTagsColumn {
		query = `SELECT id, seller_id, category_id, name, description, price, rating, status, tags, created_at, updated_at FROM products WHERE 1=1`
	}

	myQuery, args := buildEqualityQuery(&query, &params, "AND")
	rows, err := r.QueryContext(ctx, myQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get products: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		product := &model.Product{}
		if err := scanProductRow(rows, product, hasTagsColumn); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
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

func GetUsers(r *sql.DB, ctx context.Context, name *string, email *string, id *string) ([]*model.User, error) {
	users := []*model.User{}
	params := []Param{
		{Column: "name", Value: name},
		{Column: "id", Value: id},
		{Column: "email", Value: email},
	}
	query := `SELECT id, name, email, img_user, role, rating, balance, created_at, updated_at FROM users WHERE 1=1`

	myQuery, args := buildEqualityQuery(&query, &params, "AND")
	rows, err := r.QueryContext(ctx, myQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		user := &model.User{}
		if err := scanUserRow(rows, user); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}
	return users, nil
}

func GetOrders(r *sql.DB, ctx context.Context, buyerID *string, status *string) ([]*model.Order, error) {
	orders := []*model.Order{}
	params := []Param{
		{Column: "buyer_id", Value: buyerID},
		{Column: "status", Value: status},
	}
	query := `SELECT id, buyer_id, status, total_amount, created_at, updated_at FROM orders WHERE 1=1`

	myQuery, args := buildEqualityQuery(&query, &params, "AND")
	rows, err := r.QueryContext(ctx, myQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		order := &model.Order{}
		if err := scanOrderRow(rows, order); err != nil {
			return nil, fmt.Errorf("failed to scan order: %w", err)
		}
		orders = append(orders, order)
	}

	return orders, nil
}

func UpdateUser(
	r *sql.DB,
	ctx context.Context,
	id string,
	name *string,
	email *string,
	imgUser *string,
	role *string,
	rating *int32,
	balance *float64,
) (*model.User, error) {
	user := &model.User{}
	row := r.QueryRowContext(ctx,
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
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

func DeleteUser(r *sql.DB, ctx context.Context, id string) (bool, error) {
	if err := DeleteUserSessionsByUserID(r, ctx, id); err != nil {
		return false, err
	}

	res, err := r.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return rowsAffected > 0, nil
}

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

func scanProductRow(scanner rowScanner, product *model.Product, hasTagsColumn bool) error {
	var categoryID sql.NullInt32
	var rating sql.NullInt32
	var status sql.NullString
	var tags []string
	var createdAt time.Time
	var updatedAt time.Time

	var err error
	if hasTagsColumn {
		err = scanner.Scan(
			&product.ID,
			&product.SellerID,
			&categoryID,
			&product.Name,
			&product.Description,
			&product.Price,
			&rating,
			&status,
			&tags,
			&createdAt,
			&updatedAt,
		)
	} else {
		err = scanner.Scan(
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
	}
	if err != nil {
		return err
	}

	product.CategoryID = nullInt32Ptr(categoryID)
	product.Rating = nullInt32Ptr(rating)
	product.Status = nullStringPtr(status)
	product.Tags = stringSliceToPointers(tags)
	product.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	product.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return nil
}

func productsHaveTagsColumn(r *sql.DB, ctx context.Context) (bool, error) {
	var exists bool
	err := r.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = 'products'
			  AND column_name = 'tags'
		)
	`).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func scanCategoryRow(scanner rowScanner, category *model.Category) error {
	var parentID sql.NullInt32

	err := scanner.Scan(&category.ID, &category.Name, &parentID)
	if err != nil {
		return err
	}

	category.ParentID = nullInt32Ptr(parentID)
	return nil
}

func scanOrderRow(scanner rowScanner, order *model.Order) error {
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
