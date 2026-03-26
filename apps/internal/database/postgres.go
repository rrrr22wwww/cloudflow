package database

import (
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rrrr22wwww.com/cloudflow/internal/config"
)

func Connect(cfg *config.Config) (*sql.DB, error) {

	dsn := fmt.Sprintf("postgresql://%s:%s@localhost:%s/%s",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Port,
		cfg.Database.Name,
	)
	// fmt.Print(dsn)
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("sql.Open failed: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("db.Ping failed: %w", err)
	}
	return db, nil
}
