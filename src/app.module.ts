import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { BannerSliderModule } from './banner-slider/banner-slider.module';
import { NewsModule } from './news/news.module';
import { AdsModule } from './ads/ads.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
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
      useFactory: (configService: ConfigService) => {
        console.log(
          configService.get<string>('ADMIN_ACCESS_SECRET'),
          'ADMIN_ACCESS_SECRET from app.module.ts',
        );

        return {
          secret: configService.get<string>('ADMIN_ACCESS_SECRET'),
          signOptions: { expiresIn: '30m' },
        };
      },
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
        // Use dist/i18n in production, src/i18n in development
        const isProduction = process.env.NODE_ENV === 'production';
        const i18nPath = isProduction
          ? join(process.cwd(), 'dist', 'i18n')
          : join(process.cwd(), 'src', 'i18n');

        return {
          fallbackLanguage: 'en',
          loaderOptions: {
            path: i18nPath,
            watch:
              !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
          },
          typesOutputPath: join(
            process.cwd(),
            isProduction ? 'dist' : 'src',
            'generated',
            'i18n.generated.ts',
          ),
        };
      },
      resolvers: [new HeaderResolver(['x-custom-lang'])],
    }),
    UserModule,
    AuthModule,
    AdminModule,
    BannerSliderModule,
    NewsModule,
    AdsModule,
    CategoriesModule,
    ProductsModule,
    TranslationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
