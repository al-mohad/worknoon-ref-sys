import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { AgentSessionDto } from './dto/agent-session.dto.js';
import { CustomerSessionDto } from './dto/customer-session.dto.js';
import { Public } from './public.decorator.js';

const SIGN_IN_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(SIGN_IN_THROTTLE)
  @Post('customer-sessions')
  signInCustomer(@Body() dto: CustomerSessionDto) {
    return this.auth.signInCustomer(dto.email);
  }

  @Public()
  @Throttle(SIGN_IN_THROTTLE)
  @Post('agent-sessions')
  signInAgent(@Body() dto: AgentSessionDto) {
    return this.auth.signInAgent(dto.email, dto.password);
  }
}
