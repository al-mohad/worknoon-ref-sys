import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RequestWithId extends Request {
  id?: string;
}

/**
 * Every error response takes the RFC 9457 "problem details" shape instead
 * of Nest's default `{statusCode, message}` body, and always carries the
 * request id so a customer-reported error can be found in the logs.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetailsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const { status, title, detail } = this.describe(exception);

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      type: 'about:blank',
      title,
      status,
      detail,
      instance: request.originalUrl ?? request.url,
      requestId: request.id ?? null,
    });
  }

  private describe(exception: unknown): { status: number; title: string; detail: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const detail =
        typeof body === 'string'
          ? body
          : (Array.isArray((body as { message?: unknown }).message)
              ? (body as { message: string[] }).message.join('; ')
              : ((body as { message?: string }).message ?? exception.message));
      return { status, title: HttpStatus[status] ?? exception.name, detail };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      title: 'Internal Server Error',
      detail: 'Something went wrong while handling the request.',
    };
  }
}
