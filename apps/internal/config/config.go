package config

import (
	"bufio"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
)

// Конфигурация бд
type databaseconfig struct {
	Name     string
	Port     string
	Password string
	User     string
}

// Конгифигурация для запуска сервера
type serverconfig struct {
}

// Для тестировки KMS (значения для генерация секрета)
type securityconfig struct {
}

type Config struct {
	Database *databaseconfig
	Server   *serverconfig
	Security *securityconfig
}

func loadEnvFile() (*map[string]string, error) {
	dir, err := os.Getwd()
	dir = "/Users/root1/Desktop/cloudflow/.env.development"
	if err != nil {
		log.Fatal("The directory cannot be determined")
	}
	f, err := os.Open(dir)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	envs := make(map[string]string)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		var parts []string = strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			return nil, errors.New("invalid environment variable format")
		}
		envs[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
	}
	return &envs, scanner.Err()
}

func CreateConfig() (*Config, error) {
	envs, err := loadEnvFile()
	if err != nil {
		return nil, fmt.Errorf("failed to load env file: %w", err)
	}

	return &Config{
		Database: &databaseconfig{
			Name:     (*envs)["DATABASE_NAME"],
			Port:     (*envs)["DATABASE_PORT"],
			Password: (*envs)["DATABASE_PASSWORD"],
			User:     (*envs)["DATABASE_USER"],
		},
		Server:   &serverconfig{},
		Security: &securityconfig{},
	}, nil
}
