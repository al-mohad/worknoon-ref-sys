import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY, type Role } from '../common/roles.js';
import type { AuthenticatedUser } from './jwt-payload.js';

/**
 * Runs after the global JwtAuthGuard. A route with no @Roles() decorator
 * is open to any authenticated user; customer and agent tokens are never
 * interchangeable on a route that declares one.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    return required.includes(request.user?.role as Role);
  }
}
