package graph

import (
	"database/sql"
	"time"

	"github.com/rrrr22wwww/cloudflow/internal/services"
)

type Resolver struct {
	DB        *sql.DB
	Store     services.SessionStore
	JWTSecret string
	JWTTTL    time.Duration
	EmailOTP  *services.EmailOTPStore
	Email     services.EmailSender
}
