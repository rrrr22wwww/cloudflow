package services

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"strings"
)

var ErrEmailSenderNotConfigured = errors.New("email sender is not configured")

type EmailSender interface {
	SendLoginCode(ctx context.Context, to string, code string) error
}

type SMTPEmailSender struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

func (s SMTPEmailSender) SendLoginCode(ctx context.Context, to string, code string) error {
	if s.Host == "" || s.Port == "" || s.From == "" {
		return ErrEmailSenderNotConfigured
	}

	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	addr := net.JoinHostPort(s.Host, s.Port)
	auth := smtp.Auth(nil)
	if s.Username != "" || s.Password != "" {
		auth = smtp.PlainAuth("", s.Username, s.Password, s.Host)
	}

	message := buildLoginCodeMessage(s.From, to, code)
	if err := smtp.SendMail(addr, auth, s.From, []string{to}, []byte(message)); err != nil {
		return fmt.Errorf("send mail: %w", err)
	}

	return nil
}

func buildLoginCodeMessage(from, to, code string) string {
	body := fmt.Sprintf(
		"Your CloudFlow marketplace sign-in code is %s.\r\n\r\nIt expires in 5 minutes. If you did not request it, ignore this email.\r\n",
		code,
	)

	headers := map[string]string{
		"From":         from,
		"To":           to,
		"Subject":      "CloudFlow marketplace sign-in code",
		"MIME-Version": "1.0",
		"Content-Type": "text/plain; charset=UTF-8",
	}

	lines := make([]string, 0, len(headers)+2)
	for key, value := range headers {
		lines = append(lines, fmt.Sprintf("%s: %s", key, value))
	}
	lines = append(lines, "", body)

	return strings.Join(lines, "\r\n")
}
