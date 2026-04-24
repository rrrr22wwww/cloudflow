package services

import "context"

func HasRoleAccess(ctx context.Context, roles ...string) bool {
	role, err := GetRoleFromContext(ctx)
	if err != nil {
		return false
	}

	for _, allowed := range roles {
		if role == allowed {
			return true
		}
	}

	return false
}

func CanManageUsers(ctx context.Context) bool {
	return HasRoleAccess(ctx, "Creator", "Moderator")
}

func CanManageCategories(ctx context.Context) bool {
	return HasRoleAccess(ctx, "Creator", "Moderator")
}

func CanManageOtherProducts(ctx context.Context) bool {
	return HasRoleAccess(ctx, "Creator", "Moderator")
}
