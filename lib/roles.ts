export const ROLES = ["super_admin", "admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  viewer: ["read"],
  editor: ["read", "write"],
  admin: ["read", "write", "manage_content", "manage_users"],
  super_admin: ["read", "write", "manage_content", "manage_users", "manage_site", "delete"],
};

export function hasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
