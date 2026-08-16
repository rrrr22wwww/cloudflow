package logger

import (
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/rrrr22wwww/cloudflow/internal/config"
)

// Setup builds the application logger.
//
//   - LOG_TYPE=dev  → human-readable text logs to stdout, debug level.
//   - LOG_TYPE=prod → JSON logs (warn level) to LOG_PATH if set,
//     otherwise to stdout (the common case for containers).
//
// The returned cleanup function closes the log file if one was opened.
func Setup(cfg *config.Config) (*slog.Logger, func(), error) {
	cleanup := func() {}

	switch cfg.Server.LogType {
	case "dev":
		handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
		return slog.New(handler), cleanup, nil

	case "prod":
		var out io.Writer = os.Stdout
		if cfg.Server.LogPath != "" {
			f, err := os.OpenFile(cfg.Server.LogPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
			if err != nil {
				return nil, nil, fmt.Errorf("open log file: %w", err)
			}
			out = f
			cleanup = func() { f.Close() }
		}
		handler := slog.NewJSONHandler(out, &slog.HandlerOptions{
			Level: slog.LevelWarn,
		})
		return slog.New(handler), cleanup, nil

	default:
		return nil, nil, fmt.Errorf("invalid LOG_TYPE %q: expected \"dev\" or \"prod\"", cfg.Server.LogType)
	}
}
