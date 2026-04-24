package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/rrrr22wwww.com/cloudflow/graph/model"
)

func ensureServerAccessTable(r *sql.DB, ctx context.Context) error {
	_, err := r.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS server_access (
			product_id UUID PRIMARY KEY,
			ip_address VARCHAR(128) NOT NULL,
			ssh_username VARCHAR(100) NOT NULL,
			ssh_password TEXT,
			ssh_private_key TEXT,
			port INTEGER DEFAULT 22,
			connection_notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to ensure server_access table: %w", err)
	}

	return nil
}

func SetProductAccess(
	r *sql.DB,
	ctx context.Context,
	productID string,
	ipAddress string,
	sshUsername string,
	sshPassword *string,
	sshPrivateKey *string,
	port *int32,
	connectionNotes *string,
) (*model.ServerAccess, error) {
	if err := ensureServerAccessTable(r, ctx); err != nil {
		return nil, err
	}

	access := &model.ServerAccess{}
	row := r.QueryRowContext(ctx, `
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

func GetProductAccess(r *sql.DB, ctx context.Context, productID string) (*model.ServerAccess, error) {
	if err := ensureServerAccessTable(r, ctx); err != nil {
		return nil, err
	}

	access := &model.ServerAccess{}
	row := r.QueryRowContext(ctx, `
		SELECT product_id, ip_address, ssh_username, ssh_password, ssh_private_key, port, connection_notes, created_at, updated_at
		FROM server_access
		WHERE product_id = $1
	`, productID)

	if err := scanServerAccessRow(row, access); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("server access not found")
		}
		return nil, fmt.Errorf("failed to get server access: %w", err)
	}

	return access, nil
}

func UserPurchasedProduct(r *sql.DB, ctx context.Context, userID string, productID string) (bool, error) {
	var exists bool
	err := r.QueryRowContext(ctx, `
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

func formatTimePtr(value time.Time) *string {
	text := value.UTC().Format(time.RFC3339)
	return &text
}
