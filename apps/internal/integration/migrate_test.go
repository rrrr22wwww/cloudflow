//go:build integration

package integration

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// applyMigrations executes the "Up" section of every goose migration file
// in dir, in lexical (timestamp) order. Applied versions are recorded in
// goose's own goose_db_version table, which makes reruns idempotent — a
// test run interrupted halfway does not poison the database for the next
// one. The parser is intentionally minimal: the project's migrations use
// the plain `-- +goose Up` / `-- +goose Down` format without
// StatementBegin blocks. Production migrations are still applied with the
// real goose CLI.
func applyMigrations(db *sql.DB, dir string) error {
	if err := ensureVersionTable(db); err != nil {
		return err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, name := range files {
		versionID, err := migrationVersionID(name)
		if err != nil {
			return err
		}

		applied, err := versionApplied(db, versionID)
		if err != nil {
			return err
		}
		if applied {
			continue
		}

		content, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}

		up, err := extractUpSection(string(content))
		if err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}

		// Apply the migration and record its version atomically, so an
		// interrupted run never leaves a half-applied, unrecorded file.
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("%s: begin: %w", name, err)
		}
		if err := execStatements(tx, name, up); err != nil {
			tx.Rollback()
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO goose_db_version (version_id, is_applied) VALUES ($1, true)`,
			versionID,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("%s: record version: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("%s: commit: %w", name, err)
		}
	}
	return nil
}

func execStatements(tx *sql.Tx, name, sqlText string) error {
	for _, stmt := range splitStatements(sqlText) {
		if _, err := tx.Exec(stmt); err != nil {
			return fmt.Errorf("%s: exec %q: %w", name, truncate(stmt, 60), err)
		}
	}
	return nil
}

// ensureVersionTable creates goose's version table with the same schema
// the goose CLI uses, so both tools share one source of truth.
func ensureVersionTable(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS goose_db_version (
		id SERIAL PRIMARY KEY,
		version_id BIGINT NOT NULL,
		is_applied BOOLEAN NOT NULL,
		tstamp TIMESTAMP NULL DEFAULT NOW()
	)`)
	if err != nil {
		return fmt.Errorf("ensure goose_db_version: %w", err)
	}
	return nil
}

// migrationVersionID extracts the numeric prefix of a migration filename,
// e.g. "20260310200309_users.sql" -> 20260310200309.
func migrationVersionID(name string) (int64, error) {
	prefix, _, found := strings.Cut(name, "_")
	if !found {
		return 0, fmt.Errorf("%s: migration name has no version prefix", name)
	}
	id, err := strconv.ParseInt(prefix, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s: parse version prefix: %w", name, err)
	}
	return id, nil
}

func versionApplied(db *sql.DB, versionID int64) (bool, error) {
	var applied bool
	err := db.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = $1 AND is_applied)`,
		versionID,
	).Scan(&applied)
	if err != nil {
		return false, fmt.Errorf("check version %d: %w", versionID, err)
	}
	return applied, nil
}

func extractUpSection(content string) (string, error) {
	const upMarker = "-- +goose Up"
	const downMarker = "-- +goose Down"

	upIdx := strings.Index(content, upMarker)
	if upIdx == -1 {
		return "", fmt.Errorf("missing %q marker", upMarker)
	}
	section := content[upIdx+len(upMarker):]

	if downIdx := strings.Index(section, downMarker); downIdx != -1 {
		section = section[:downIdx]
	}
	return section, nil
}

// splitStatements splits SQL text on semicolons and drops fragments that
// contain no actual statement (empty or comment-only). This is safe for
// this project's migrations, which contain no semicolons inside string
// literals or function bodies.
func splitStatements(sqlText string) []string {
	var out []string
	for _, fragment := range strings.Split(sqlText, ";") {
		if hasStatement(fragment) {
			out = append(out, fragment)
		}
	}
	return out
}

func hasStatement(fragment string) bool {
	for _, line := range strings.Split(fragment, "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "--") {
			return true
		}
	}
	return false
}

func truncate(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
