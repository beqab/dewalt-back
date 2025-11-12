import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });

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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
