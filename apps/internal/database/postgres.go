package database

import (
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rrrr22wwww.com/cloudflow/internal/config"
)

func Connect() (*sql.DB, error) {
	cfg, err := config.CreateConfig()
	if err != nil {
		return nil, fmt.Errorf("config.CreateConfig(database) failed: %w", err)
	}

	dsn := fmt.Sprintf("postgresql://%s:%s@localhost:%s/%s",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Port,
		cfg.Database.Name,
	)
	// fmt.Print(dsn)
	db, err := sql.Open("pgx", dsn)
	defer db.Close()
	if err != nil {
		return nil, fmt.Errorf("sql.Open failed: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("db.Ping failed: %w", err)
	}
	return db, nil
}

//		rows, err := db.Query(`
//	    SELECT name
//	    FROM users
//
// `)
//
//	if err != nil {
//		log.Fatal(err)
//	}
//	defer rows.Close()
//	for rows.Next() {
//		var pos int
//		var name, dataType, nullable string
//		var def *string
//		if err := rows.Scan(&pos, &name, &dataType, &nullable, &def); err != nil {
//			log.Fatal(err)
//		}
//		fmt.Println(pos, name, dataType, nullable, def)
//	}
// func main() {
// 	connect()
// }
