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
	"github.com/rrrr22wwww/cloudflow/graph"
	"github.com/rrrr22wwww/cloudflow/internal/config"
	"github.com/rrrr22wwww/cloudflow/internal/database"
	"github.com/rrrr22wwww/cloudflow/internal/logger"
	"github.com/rrrr22wwww/cloudflow/internal/middleware"
	"github.com/rrrr22wwww/cloudflow/internal/services"
)

//go:embed static/auth-test.html
var authTestPage []byte

func main() {
	cfg, err := config.CreateConfig()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		os.Exit(1)
	}

	log, cleanup, err := logger.Setup(cfg)
	if err != nil {
		slog.Error("Failed to set up logger", "error", err)
		os.Exit(1)
	}
	defer cleanup()
	slog.SetDefault(log)

	db, err := database.Connect(cfg)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	jwtTTL, err := time.ParseDuration(cfg.Security.JWTTTL)
	if err != nil {
		slog.Error("Failed to parse JWT_TTL", "error", err)
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
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/healthz", func(c *gin.Context) {
		if err := db.Ping(); err != nil {
			c.JSON(503, gin.H{"status": "degraded", "error": "database unreachable"})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/auth-test", func(c *gin.Context) {
		c.Data(200, "text/html; charset=utf-8", authTestPage)
	})
	r.GET("/", gin.WrapH(playground.Handler("GraphQL", "/query")))

	addr := cfg.Server.Host + ":" + cfg.Server.Port
	slog.Info("Server starting", "addr", addr)
	if err := r.Run(addr); err != nil {
		slog.Error("Server stopped", "error", err)
		os.Exit(1)
	}
}
