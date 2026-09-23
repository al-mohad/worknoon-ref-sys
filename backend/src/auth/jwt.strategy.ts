import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppEnv } from '../config/env.schema.js';
import type { AuthenticatedUser, JwtPayload } from './jwt-payload.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppEnv, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, role: payload.role, name: payload.name };
  }
}
