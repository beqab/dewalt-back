import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Brand, BrandSchema } from './entities/brand.entity';
import { Category, CategorySchema } from './entities/category.entity';
import {
  ChildCategory,
  ChildCategorySchema,
} from './entities/child-category.entity';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
      { name: ChildCategory.name, schema: ChildCategorySchema },
    ]),
    TranslationModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
