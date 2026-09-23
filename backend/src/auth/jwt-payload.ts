import type { Role } from '../common/roles.js';

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
  name: string;
}
