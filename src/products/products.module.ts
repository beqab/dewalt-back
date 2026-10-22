import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { FinaStockSyncCron } from './fina-stock-sync.cron';
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
import { FinaModule } from '../fina/fina.module';
import { Order, OrderSchema } from '../orders/entities/order.entity';
@Module({
  imports: [
    TranslationModule,
    FinaModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
      { name: ChildCategory.name, schema: ChildCategorySchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, FinaStockSyncCron],
  exports: [ProductsService],
})
export class ProductsModule {}
