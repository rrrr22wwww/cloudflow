//go:build integration

// Package integration contains end-to-end tests for the auth flow.
//
// The tests run the real HTTP stack (Gin router, authorization middleware,
// gqlgen resolvers) against a real PostgreSQL database. Migrations are
// applied automatically before the suite starts.
//
// Run locally:
//
//	docker compose -f docker-compose.dev.yml up -d
//	TEST_DATABASE_DSN="postgres://cloudflow:change-me@localhost:5432/cloudflow_test?sslmode=disable" \
//	  go test -tags=integration ./internal/integration/
//
// In CI the DSN points at a postgres service container (see .github/workflows/ci.yml).
package integration

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/rrrr22wwww/cloudflow/graph"
	"github.com/rrrr22wwww/cloudflow/internal/middleware"
	"github.com/rrrr22wwww/cloudflow/internal/services"
)

const testJWTSecret = "integration-test-secret-not-for-production"

var (
	testDB     *sql.DB
	testRouter *gin.Engine
)

func TestMain(m *testing.M) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		fmt.Println("TEST_DATABASE_DSN is not set; skipping integration tests")
		os.Exit(0)
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		fmt.Printf("open test database: %v\n", err)
		os.Exit(1)
	}
	if err := waitForDB(db, 15*time.Second); err != nil {
		fmt.Printf("test database is not reachable: %v\n", err)
		os.Exit(1)
	}
	if err := applyMigrations(db, "../../../lib/migration/postgres"); err != nil {
		fmt.Printf("apply migrations: %v\n", err)
		os.Exit(1)
	}

	testDB = db
	testRouter = newTestRouter(db)

	code := m.Run()
	db.Close()
	os.Exit(code)
}

// newTestRouter builds the same HTTP stack as cmd/server/main.go,
// minus logging middleware and the email sender.
func newTestRouter(db *sql.DB) *gin.Engine {
	jwtTTL := time.Hour
	store := services.NewMemorySessionStore(db, jwtTTL)

	gin.SetMode(gin.TestMode)
	r := gin.New()

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{
			DB:        db,
			Store:     store,
			JWTSecret: testJWTSecret,
			JWTTTL:    jwtTTL,
		},
	}))

	r.POST("/query", middleware.Authorization(store, testJWTSecret), gin.WrapH(srv))
	return r
}

// gql posts a GraphQL query and decodes the response envelope.
func gql(t *testing.T, token, query string, variables map[string]any) (map[string]json.RawMessage, []map[string]any, int) {
	t.Helper()

	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/query", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	rec := httptest.NewRecorder()
	testRouter.ServeHTTP(rec, req)

	var envelope struct {
		Data   map[string]json.RawMessage `json:"data"`
		Errors []map[string]any           `json:"errors"`
	}
	if len(rec.Body.Bytes()) > 0 {
		if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
			t.Fatalf("decode response (status %d): %v\nbody: %s", rec.Code, err, rec.Body.String())
		}
	}
	return envelope.Data, envelope.Errors, rec.Code
}

type authPayload struct {
	Token string `json:"token"`
	User  struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"user"`
}

func register(t *testing.T, name, email, password string) authPayload {
	t.Helper()

	const mutation = `mutation ($name: String!, $email: String!, $password: String!) {
		register(name: $name, email: $email, img_user: "", password: $password) {
			token
			user { id name email }
		}
	}`

	data, errs, code := gql(t, "", mutation, map[string]any{
		"name": name, "email": email, "password": password,
	})
	if code != http.StatusOK || len(errs) > 0 {
		t.Fatalf("register failed: status=%d errors=%v", code, errs)
	}

	var out authPayload
	if err := json.Unmarshal(data["register"], &out); err != nil {
		t.Fatalf("decode register payload: %v", err)
	}
	if out.Token == "" || out.User.ID == "" {
		t.Fatalf("register returned empty token or user: %+v", out)
	}
	return out
}

func uniqueEmail(prefix string) string {
	return fmt.Sprintf("%s-%d@integration.test", prefix, time.Now().UnixNano())
}

func TestRegisterReturnsWorkingToken(t *testing.T) {
	email := uniqueEmail("register")
	auth := register(t, "alice", email, "s3cure-pass")

	// The token from register must be immediately usable.
	data, errs, code := gql(t, auth.Token, `query { me { id email } }`, nil)
	if code != http.StatusOK || len(errs) > 0 {
		t.Fatalf("me with fresh token failed: status=%d errors=%v", code, errs)
	}

	var me struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(data["me"], &me); err != nil {
		t.Fatalf("decode me: %v", err)
	}
	if me.ID != auth.User.ID || me.Email != email {
		t.Fatalf("me returned wrong user: got %+v, want id=%s email=%s", me, auth.User.ID, email)
	}
}

func TestLoginWithCorrectAndWrongPassword(t *testing.T) {
	email := uniqueEmail("login")
	register(t, "bob-login", email, "correct-password")

	const mutation = `mutation ($email: String!, $password: String!) {
		login(email: $email, password: $password) { token user { id } }
	}`

	// Correct password → token.
	data, errs, code := gql(t, "", mutation, map[string]any{"email": email, "password": "correct-password"})
	if code != http.StatusOK || len(errs) > 0 {
		t.Fatalf("login with correct password failed: status=%d errors=%v", code, errs)
	}
	var out authPayload
	if err := json.Unmarshal(data["login"], &out); err != nil {
		t.Fatalf("decode login payload: %v", err)
	}
	if out.Token == "" {
		t.Fatal("login returned an empty token")
	}

	// Wrong password → GraphQL error, no token.
	_, errs, _ = gql(t, "", mutation, map[string]any{"email": email, "password": "wrong-password"})
	if len(errs) == 0 {
		t.Fatal("login with wrong password unexpectedly succeeded")
	}

	// Unknown email → same generic error (no user enumeration).
	_, errs, _ = gql(t, "", mutation, map[string]any{"email": uniqueEmail("ghost"), "password": "whatever"})
	if len(errs) == 0 {
		t.Fatal("login with unknown email unexpectedly succeeded")
	}
}

func TestProtectedQueryRequiresToken(t *testing.T) {
	// No token → the middleware must reject before reaching resolvers.
	_, _, code := gql(t, "", `query { me { id } }`, nil)
	if code != http.StatusUnauthorized {
		t.Fatalf("me without token: got status %d, want %d", code, http.StatusUnauthorized)
	}

	// Garbage token → also rejected.
	_, _, code = gql(t, "not-a-jwt", `query { me { id } }`, nil)
	if code != http.StatusUnauthorized {
		t.Fatalf("me with garbage token: got status %d, want %d", code, http.StatusUnauthorized)
	}
}

func TestLogoutRevokesToken(t *testing.T) {
	email := uniqueEmail("logout")
	auth := register(t, "carol-logout", email, "s3cure-pass")

	// Logout with the token.
	_, errs, code := gql(t, auth.Token, `mutation { logout }`, nil)
	if code != http.StatusOK || len(errs) > 0 {
		t.Fatalf("logout failed: status=%d errors=%v", code, errs)
	}

	// The same token must now be rejected: this is exactly why sessions
	// exist on top of stateless JWT.
	_, _, code = gql(t, auth.Token, `query { me { id } }`, nil)
	if code != http.StatusUnauthorized {
		t.Fatalf("me after logout: got status %d, want %d", code, http.StatusUnauthorized)
	}
}

func TestSessionPersistedInDatabase(t *testing.T) {
	email := uniqueEmail("session")
	auth := register(t, "dave-session", email, "s3cure-pass")

	var count int
	err := testDB.QueryRow(
		`SELECT COUNT(*) FROM user_sessions WHERE token = $1 AND user_id = $2`,
		auth.Token, auth.User.ID,
	).Scan(&count)
	if err != nil {
		t.Fatalf("query user_sessions: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 session row for the token, got %d", count)
	}
}

func waitForDB(db *sql.DB, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var lastErr error
	for time.Now().Before(deadline) {
		if lastErr = db.Ping(); lastErr == nil {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return lastErr
}
