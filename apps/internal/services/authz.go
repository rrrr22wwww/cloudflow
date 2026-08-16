package services

import "context"

// Role names as stored in the users.role enum (see the users migration).
const (
	RoleUser      = "User"
	RoleSeller    = "Seller"
	RoleModerator = "Moderator"
	RoleCreator   = "Creator"
)

// HasRoleAccess reports whether the authenticated user has one of the
// given roles.
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
	return HasRoleAccess(ctx, RoleCreator, RoleModerator)
}

func CanManageCategories(ctx context.Context) bool {
	return HasRoleAccess(ctx, RoleCreator, RoleModerator)
}

func CanManageOtherProducts(ctx context.Context) bool {
	return HasRoleAccess(ctx, RoleCreator, RoleModerator)
}
