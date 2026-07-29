import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { securityHeaders } from './security/security-headers';
import { createCorsOptions } from './common/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(securityHeaders);
  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors(createCorsOptions());

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`Backend corriendo en el puerto ${port}`);
}

void bootstrap();
