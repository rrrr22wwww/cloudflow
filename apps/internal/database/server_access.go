package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/rrrr22wwww/cloudflow/graph/model"
)

// SetProductAccess creates or replaces the connection details for a
// product. Authorization (seller or moderator only) is enforced by the
// resolver layer.
func SetProductAccess(
	ctx context.Context,
	db *sql.DB,
	productID string,
	ipAddress string,
	sshUsername string,
	sshPassword *string,
	sshPrivateKey *string,
	port *int32,
	connectionNotes *string,
) (*model.ServerAccess, error) {
	access := &model.ServerAccess{}
	row := db.QueryRowContext(ctx, `
		INSERT INTO server_access (
			product_id,
			ip_address,
			ssh_username,
			ssh_password,
			ssh_private_key,
			port,
			connection_notes
		)
		VALUES ($1, $2, $3, $4, $5, COALESCE($6, 22), $7)
		ON CONFLICT (product_id) DO UPDATE
		SET ip_address = EXCLUDED.ip_address,
		    ssh_username = EXCLUDED.ssh_username,
		    ssh_password = EXCLUDED.ssh_password,
		    ssh_private_key = EXCLUDED.ssh_private_key,
		    port = EXCLUDED.port,
		    connection_notes = EXCLUDED.connection_notes,
		    updated_at = NOW()
		RETURNING product_id, ip_address, ssh_username, ssh_password, ssh_private_key, port, connection_notes, created_at, updated_at
	`, productID, ipAddress, sshUsername, sshPassword, sshPrivateKey, port, connectionNotes)

	if err := scanServerAccessRow(row, access); err != nil {
		return nil, fmt.Errorf("failed to save server access: %w", err)
	}

	return access, nil
}

// GetProductAccess returns the connection details for a product.
// Authorization (buyer of the product or moderator) is enforced by the
// resolver layer.
func GetProductAccess(ctx context.Context, db *sql.DB, productID string) (*model.ServerAccess, error) {
	access := &model.ServerAccess{}
	row := db.QueryRowContext(ctx, `
		SELECT product_id, ip_address, ssh_username, ssh_password, ssh_private_key, port, connection_notes, created_at, updated_at
		FROM server_access
		WHERE product_id = $1
	`, productID)

	if err := scanServerAccessRow(row, access); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("server access: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("failed to get server access: %w", err)
	}

	return access, nil
}

// UserPurchasedProduct reports whether the user has a successfully paid
// order (status 200) containing the product.
func UserPurchasedProduct(ctx context.Context, db *sql.DB, userID string, productID string) (bool, error) {
	var exists bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM order_items oi
			JOIN orders o ON o.id = oi.order_id
			WHERE oi.product_id = $1
			  AND o.buyer_id = $2
			  AND o.status = 200
		)
	`, productID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check product purchase: %w", err)
	}

	return exists, nil
}

func scanServerAccessRow(scanner rowScanner, access *model.ServerAccess) error {
	var sshPassword sql.NullString
	var sshPrivateKey sql.NullString
	var port sql.NullInt32
	var connectionNotes sql.NullString
	var createdAt sql.NullTime
	var updatedAt sql.NullTime

	err := scanner.Scan(
		&access.ProductID,
		&access.IPAddress,
		&access.SSHUsername,
		&sshPassword,
		&sshPrivateKey,
		&port,
		&connectionNotes,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return err
	}

	access.SSHPassword = nullStringPtr(sshPassword)
	access.SSHPrivateKey = nullStringPtr(sshPrivateKey)
	access.Port = nullInt32Ptr(port)
	access.ConnectionNotes = nullStringPtr(connectionNotes)
	access.CreatedAt = nullTimePtr(createdAt)
	access.UpdatedAt = nullTimePtr(updatedAt)
	return nil
}
