package main

import (
	_ "embed"
	"log/slog"
	"os"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rrrr22wwww.com/cloudflow/graph"
	"github.com/rrrr22wwww.com/cloudflow/internal/config"
	"github.com/rrrr22wwww.com/cloudflow/internal/database"
	"github.com/rrrr22wwww.com/cloudflow/internal/logger"
	"github.com/rrrr22wwww.com/cloudflow/internal/middleware"
	"github.com/rrrr22wwww.com/cloudflow/internal/services"
)

//go:embed static/auth-test.html
var authTestPage []byte

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

	jwtTTL := 24 * time.Hour
	if cfg.Security.JWTTTL != "" {
		parsedTTL, err := time.ParseDuration(cfg.Security.JWTTTL)
		if err != nil {
			slog.Error("Failed to parse JWT TTL", "error", err)
			os.Exit(1)
		}
		jwtTTL = parsedTTL
	}

	if cfg.Security.JWTSecret == "" {
		slog.Error("JWT_SECRET is empty")
		os.Exit(1)
	}

	store := services.NewMemorySessionStore(db, jwtTTL)
	emailOTPStore := services.NewEmailOTPStore(5*time.Minute, cfg.Security.JWTSecret)
	emailSender := services.SMTPEmailSender{
		Host:     cfg.Mail.SMTPHost,
		Port:     cfg.Mail.SMTPPort,
		Username: cfg.Mail.SMTPUsername,
		Password: cfg.Mail.SMTPPassword,
		From:     cfg.Mail.SMTPFrom,
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(middleware.SlogLogger(), middleware.SlogRecovery())

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			DB:        db,
			Store:     store,
			JWTSecret: cfg.Security.JWTSecret,
			JWTTTL:    jwtTTL,
			EmailOTP:  emailOTPStore,
			Email:     emailSender,
		},
	}))
	r.POST("/query", middleware.Authorization(store, cfg.Security.JWTSecret), gin.WrapH(srv))
	r.GET("/public/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "public api stub"})
	})
	r.GET("/auth-test", func(c *gin.Context) {
		c.Data(200, "text/html; charset=utf-8", authTestPage)
	})
	r.GET("/", gin.WrapH(playground.Handler("GraphQL", "/query")))
	// r.GET("/ping", func(c *gin.Context) {
	// 	c.JSON(200, gin.H{"msg": "hi"})
	// })
	r.Run(":8080")
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
