package main

import (
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rrrr22wwww.com/cloudflow/internal/config"
	"github.com/rrrr22wwww.com/cloudflow/internal/database"
	"github.com/rrrr22wwww.com/cloudflow/internal/logger"
)

func main() {
	cfg, err := config.CreateConfig()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		os.Exit(1)
	}

	logger, claenup, err := logger.Setup(cfg)
	if err != nil {
		slog.Error("Failed to load logger", "error", err)
		os.Exit(1)
	}
	defer claenup()
	slog.SetDefault(logger)

	db, err := database.Connect(cfg)
	if err != nil {
		panic(err)
	}
	defer db.Close()
	server := gin.New()
}

// stats := db.Stats()
// fmt.Printf("OpenConnections: %d\n", stats.OpenConnections)
// fmt.Printf("InUse: %d\n", stats.InUse)
// fmt.Printf("Idle: %d\n", stats.Idle)
// var version, dbname string
// db.QueryRow("SELECT version(), current_database()").Scan(&version, &dbname)
// fmt.Printf("Database: %s\n", dbname)
// fmt.Printf("Version: %s\n", version)
// rows, err := db.Query(`
// 	    SELECT name
// 	    FROM users

// `)
// if err != nil {
// 	fmt.Println("No rows were returned %w", err)

// }
// if !rows.Next() {
// 	fmt.Println("No rows were returned")
// }
