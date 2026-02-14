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
import { RatingsModule } from './ratings/ratings.module';
import { MongooseModule } from '@nestjs/mongoose';
import { I18nModule, HeaderResolver } from 'nestjs-i18n';
import { join } from 'path';
import { TranslationModule } from './translation/translation.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OrdersModule } from './orders/orders.module';
import { RevalidateModule } from './revalidate/revalidate.module';
import { FinaModule } from './fina/fina.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load from .env file if it exists, but always read from process.env (Railway, Vercel, etc.)
      // This matches how Next.js apps handle environment variables
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
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Read directly from process.env (Railway/Vercel set these directly)
        // This matches how flexfit-admin handles environment variables
        const uri =
          process.env.MONGODB_URI || configService.get<string>('MONGODB_URI');

        if (!uri) {
          throw new Error(
            'MONGODB_URI environment variable is not set. Please configure it in Railway Variables tab.',
          );
        }

        return { uri };
      },
      inject: [ConfigService],
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
    RatingsModule,
    OrdersModule,
    TranslationModule,
    RevalidateModule,
    FinaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
