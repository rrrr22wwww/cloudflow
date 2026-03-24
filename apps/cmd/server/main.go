package main

import (
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rrrr22wwww.com/cloudflow/internal/database"
)

func main() {
	db, err := database.Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	stats := db.Stats()
	fmt.Printf("OpenConnections: %d\n", stats.OpenConnections)
	fmt.Printf("InUse: %d\n", stats.InUse)
	fmt.Printf("Idle: %d\n", stats.Idle)
	var version, dbname string
	db.QueryRow("SELECT version(), current_database()").Scan(&version, &dbname)
	fmt.Printf("Database: %s\n", dbname)
	fmt.Printf("Version: %s\n", version)
	rows, err := db.Query(`
		    SELECT name
		    FROM users

	`)
	if err != nil {
		fmt.Println("No rows were returned %w", err)

	}
	if !rows.Next() {
		fmt.Println("No rows were returned")
	}
}
