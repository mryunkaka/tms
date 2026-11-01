export const USER_ROLES = ['ADMIN', 'AGENT', 'CUSTOMER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface PublicUser {
  id: string;
  email: string;
  roles: UserRole[];
}
