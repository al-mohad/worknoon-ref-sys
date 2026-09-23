import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export type Role = 'customer' | 'agent';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
