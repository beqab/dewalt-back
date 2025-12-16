import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { BannerSliderModule } from './banner-slider/banner-slider.module';
import { MongooseModule } from '@nestjs/mongoose';
import { I18nModule, HeaderResolver } from 'nestjs-i18n';
import { join } from 'path';
import { TranslationModule } from './translation/translation.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Make JwtModule global so all modules can use AdminAuthGuard
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_ACCESS_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
      inject: [ConfigService],
      global: true, // Make it available to all modules
    }),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
          throw new Error('MONGODB_URI environment variable is not set.');
        }

        return { uri };
      },
    }),
    I18nModule.forRootAsync({
      useFactory: () => {
        // In production (dist), use __dirname. In dev (src), use process.cwd() + src/i18n
        const isProduction = __dirname.includes('dist');
        const i18nPath = isProduction
          ? join(__dirname, 'i18n')
          : join(process.cwd(), 'src', 'i18n');

        return {
          fallbackLanguage: 'en',
          loaderOptions: {
            path: i18nPath,
            watch: true,
          },
          typesOutputPath: join(
            __dirname,
            '../src/generated/i18n.generated.ts',
          ),
        };
      },
      resolvers: [new HeaderResolver(['x-custom-lang'])],
    }),
    UserModule,
    AdminModule,
    BannerSliderModule,
    TranslationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
