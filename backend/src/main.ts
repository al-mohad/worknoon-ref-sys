import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { DEMO_JWT_SECRET } from './config/config.module.js';
import type { AppEnv } from './config/env.schema.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<AppEnv, true>);
  if (config.get('JWT_SECRET', { infer: true }) === DEMO_JWT_SECRET) {
    app.get(Logger).warn('JWT_SECRET is the demo default - set your own before deploying anywhere shared.');
  }

  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ProblemDetailsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Refund Desk API')
    .setDescription('AI-assisted refund request handling for Oakline.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
  app.get(Logger).log(`Refund Desk API listening on port ${port}`);
}

await bootstrap();
