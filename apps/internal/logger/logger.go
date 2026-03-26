package logger

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/rrrr22wwww.com/cloudflow/internal/config"
)

func Setup(env *config.Config) (*slog.Logger, func(), error) {

	f, err := os.OpenFile(
		env.Server.Lpath,
		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed os.OpenFile: %w", err)
	}

	var handler slog.Handler

	switch env.Server.Flog {
	case "prod":
		handler = slog.NewJSONHandler(f, &slog.HandlerOptions{
			Level: slog.LevelWarn,
		})
	case "dev":
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	default:
		return nil, nil, fmt.Errorf("invalid log format: %s", env.Server.Flog)
	}
	close := func() { f.Close() }
	return slog.New(handler), close, nil
}
