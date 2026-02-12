import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { NewsArticle, NewsArticleSchema } from './entities/news.entity';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsArticle.name, schema: NewsArticleSchema },
    ]),
    TranslationModule,
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
