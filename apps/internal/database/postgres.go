package database

import (
	_ "github.com/jackc/pgx/v5/stdlib"
)

func connect() error {
	// cfg, err := config.CreateConfig()
	// if err != nil {
	// 	return err
	// }

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
