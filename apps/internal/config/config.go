package config

import (
	"bufio"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
)

type databaseconfig struct {
	name     string
	port     string
	password string
	user     string
}

type serverconfig struct {
}

type securityconfig struct {
}

type Config struct {
	Database *databaseconfig
	Server   *serverconfig
	Security *securityconfig
}

func loadEnvFile() error {
	dir, err := os.Getwd()
	if err != nil {
		log.Fatal("The directory cannot be determined")
	}
	f, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		var parts []string = strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			return errors.New("invalid environment variable format")
		}
		err := os.Setenv(strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]))
		if err != nil {
			return err
		}
	}
	return scanner.Err()
}

func CreateConfig() (*Config, error) {
	if err := loadEnvFile(); err != nil {
		return nil, fmt.Errorf("failed to load env file: %w", err)
	}

	required := []string{
		"DATABASE_NAME",
		"DATABASE_PORT",
		"DATABASE_PASSWORD",
		"DATABASE_USER",
	}

	envs := make(map[string]string)
	for _, key := range required {
		val, ok := os.LookupEnv(key)
		if !ok {
			return nil, fmt.Errorf("environment variable %s not set", key)
		}
		envs[key] = val
	}

	return &Config{
		Database: &databaseconfig{
			name:     envs["DATABASE_NAME"],
			port:     envs["DATABASE_PORT"],
			password: envs["DATABASE_PASSWORD"],
			user:     envs["DATABASE_USER"],
		},
		Server:   &serverconfig{},
		Security: &securityconfig{},
	}, nil
}
