package graph

import (
	"database/sql"
	"time"

	"github.com/rrrr22wwww.com/cloudflow/internal/services"
)

type Resolver struct {
	DB        *sql.DB
	Store     services.SessionStore
	JWTSecret string
	JWTTTL    time.Duration
}
