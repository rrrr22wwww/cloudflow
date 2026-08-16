package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
	SSLMode  string
}

// ServerConfig holds HTTP server and logging settings.
type ServerConfig struct {
	Host    string
	Port    string
	LogType string // "prod" | "dev"
	LogPath string
}

// SecurityConfig holds JWT settings.
// In production these values should come from a secret manager, not a file.
type SecurityConfig struct {
	JWTSecret string
	JWTTTL    string
}

// MailConfig holds SMTP settings for the email OTP flow.
type MailConfig struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
}

type Config struct {
	Database *DatabaseConfig
	Server   *ServerConfig
	Security *SecurityConfig
	Mail     *MailConfig
}

// CreateConfig builds the application config.
//
// Resolution order (highest priority first):
//  1. Real environment variables (works in Docker / CI / production).
//  2. An optional env file: the path from CLOUDFLOW_ENV_FILE, or the first
//     of ".env", ".env.development" found in the working directory or its parent.
//
// Values from the env file never override variables already set in the
// environment.
func CreateConfig() (*Config, error) {
	if err := loadEnvFile(); err != nil {
		return nil, err
	}

	cfg := &Config{
		Database: &DatabaseConfig{
			Host:     getEnv("DATABASE_HOST", "localhost"),
			Port:     getEnv("DATABASE_PORT", "5432"),
			Name:     os.Getenv("DATABASE_NAME"),
			User:     os.Getenv("DATABASE_USER"),
			Password: os.Getenv("DATABASE_PASSWORD"),
			SSLMode:  getEnv("DATABASE_SSLMODE", "disable"),
		},
		Server: &ServerConfig{
			Host:    getEnv("SERVER_HOST", "0.0.0.0"),
			Port:    getEnv("SERVER_PORT", "8080"),
			LogType: getEnv("LOG_TYPE", "dev"),
			LogPath: os.Getenv("LOG_PATH"),
		},
		Security: &SecurityConfig{
			JWTSecret: os.Getenv("JWT_SECRET"),
			JWTTTL:    getEnv("JWT_TTL", "24h"),
		},
		Mail: &MailConfig{
			SMTPHost:     os.Getenv("SMTP_HOST"),
			SMTPPort:     os.Getenv("SMTP_PORT"),
			SMTPUsername: os.Getenv("SMTP_USERNAME"),
			SMTPPassword: os.Getenv("SMTP_PASSWORD"),
			SMTPFrom:     os.Getenv("SMTP_FROM"),
		},
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	var missing []string
	if c.Database.Name == "" {
		missing = append(missing, "DATABASE_NAME")
	}
	if c.Database.User == "" {
		missing = append(missing, "DATABASE_USER")
	}
	if c.Database.Password == "" {
		missing = append(missing, "DATABASE_PASSWORD")
	}
	if c.Security.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required environment variables: %s (see .env.example)", strings.Join(missing, ", "))
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// loadEnvFile loads KEY=VALUE pairs from an env file into the process
// environment without overriding already-set variables. Missing file is
// not an error: in Docker/CI all values come from the real environment.
func loadEnvFile() error {
	path := os.Getenv("CLOUDFLOW_ENV_FILE")
	if path == "" {
		for _, candidate := range []string{".env", ".env.development", "../.env", "../.env.development"} {
			if _, err := os.Stat(candidate); err == nil {
				path = candidate
				break
			}
		}
	}
	if path == "" {
		return nil
	}

	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open env file %s: %w", filepath.Clean(path), err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			return fmt.Errorf("invalid line in env file %s: %q", path, line)
		}
		key := strings.TrimSpace(parts[0])
		value := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, value)
		}
	}
	return scanner.Err()
}
