package domain

import "time"

type User struct {
	role     string
	ID       string
	Name     string
	Rating   string
	Balance  string
	CreateAt time.Duration
}
