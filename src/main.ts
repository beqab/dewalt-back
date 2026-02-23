import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable cookie parser middleware
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const formattedErrors = errors.reduce((acc, error) => {
          acc[error.property] = Object.values(error.constraints ?? {});
          return acc;
        }, {});
        return new BadRequestException({ message: formattedErrors });
      },
      whitelist: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Dewalt API')
    .setDescription('Dewalt Backend API Documentation')
    .setVersion('1.0')
    .addTag('admin', 'Admin management endpoints')
    .addTag('auth', 'User authentication endpoints')
    .addTag('user', 'User management endpoints')
    .addTag('banner-slider', 'Banner slider management endpoints')
    .addTag('news', 'News articles management endpoints')
    .addTag('ads', 'Ads management endpoints')
    .addTag(
      'categories',
      'Categories, brands and child categories management endpoints',
    )
    .addBearerAuth(
      {
        type: 'apiKey',
        in: 'header',
        name: 'authorization',
        description: 'Enter JWT token directly (without Bearer prefix)',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // NOTE: keep /api/* available for real endpoints (FINA proxy routes).
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api-docs`);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
