import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './entities/product.entity';
import { Brand, BrandSchema } from '../categories/entities/brand.entity';
import {
  Category,
  CategorySchema,
} from '../categories/entities/category.entity';
import {
  ChildCategory,
  ChildCategorySchema,
} from '../categories/entities/child-category.entity';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    TranslationModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
      { name: ChildCategory.name, schema: ChildCategorySchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
