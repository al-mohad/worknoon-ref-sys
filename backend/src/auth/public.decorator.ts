import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as reachable without a bearer token, overriding the global JwtAuthGuard. */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
