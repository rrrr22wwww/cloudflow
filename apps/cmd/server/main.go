package main

import (
	"bufio"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type GENV struct {
	nameDB     string
	portDB     string
	passwordDB string
	userDB     string
}

func loadEnvFile() error {
	f, err := os.Open("/Users/root1/Desktop/cloudflow/.env.development")
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

func initEnv() (*GENV, error) {
	nameDB, ok := os.LookupEnv("DATABASE_NAME")
	if !ok {
		return nil, errors.New("DATABASE_NAME environment variable not set")
	}
	userDB, ok := os.LookupEnv("DATABASE_USER")
	if !ok {
		return nil, errors.New("DATABASE_USER environment variable not set")
	}
	portDB, ok := os.LookupEnv("DATABASE_PORT")
	if !ok {
		return nil, errors.New("DATABASE_PORT environment variable not set")
	}
	passwordDB, ok := os.LookupEnv("DATABASE_PASSWORD")
	if !ok {
		return nil, errors.New("DATABASE_PASSWORD environment variable not set")
	}
	return &GENV{nameDB, portDB, passwordDB, userDB}, nil
}

func main() {
	err := loadEnvFile()
	if err != nil {
		panic(err)
	}
	srcdata, err := initEnv()
	if err != nil {
		panic(err)
	}
	dsn := "postgres://" + srcdata.userDB + ":" + srcdata.passwordDB + "@localhost:" + srcdata.portDB + "/" + srcdata.nameDB + "?sslmode=disable"
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	rows, err := db.Query(`
    SELECT name
    FROM users
`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var pos int
		var name, dataType, nullable string
		var def *string
		if err := rows.Scan(&pos, &name, &dataType, &nullable, &def); err != nil {
			log.Fatal(err)
		}
		fmt.Println(pos, name, dataType, nullable, def)
	}
}

func loadConfig() {

}
