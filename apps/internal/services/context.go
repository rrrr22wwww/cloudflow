package services

import (
	"context"
	"fmt"
)

type contextKey string

const (
	authUserIDKey        contextKey = "auth_user_id"
	authRoleKey          contextKey = "auth_role"
	authTokenKey         contextKey = "auth_token"
	authenticatedFlagKey contextKey = "authenticated"
)

func WithAuth(ctx context.Context, userID, role, token string) context.Context {
	ctx = context.WithValue(ctx, authUserIDKey, userID)
	ctx = context.WithValue(ctx, authRoleKey, role)
	ctx = context.WithValue(ctx, authTokenKey, token)
	ctx = context.WithValue(ctx, authenticatedFlagKey, true)
	return ctx
}

func IsAuthenticated(ctx context.Context) bool {
	val, ok := ctx.Value(authenticatedFlagKey).(bool)
	return ok && val
}

func GetUserIDFromContext(ctx context.Context) (string, error) {
	val, ok := ctx.Value(authUserIDKey).(string)
	if !ok || val == "" {
		return "", fmt.Errorf("user id not found in context")
	}
	return val, nil
}

func GetTokenFromContext(ctx context.Context) (string, error) {
	val, ok := ctx.Value(authTokenKey).(string)
	if !ok || val == "" {
		return "", fmt.Errorf("token not found in context")
	}
	return val, nil
}
