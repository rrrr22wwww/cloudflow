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
	rows, err := db.Query(`
	    SELECT name
	    FROM users

`)
	if err != nil {

	}

	fmt.Print(rows)

	//		err := loadEnvFile()
	//		if err != nil {
	//			panic(err)
	//		}
	//		srcdata, err := initEnv()
	//		if err != nil {
	//			panic(err)
	//		}
	//		dsn := "postgres://" + srcdata.userDB + ":" + srcdata.passwordDB + "@localhost:" + srcdata.portDB + "/" + srcdata.nameDB + "?sslmode=disable"
	//		db, err := sql.Open("pgx", dsn)
	//		if err != nil {
	//			log.Fatal(err)
	//		}
	//		defer db.Close()
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
}
