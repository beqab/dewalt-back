import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import {
  ProductRating,
  ProductRatingSchema,
} from './entities/product-rating.entity';
import { Product, ProductSchema } from '../products/entities/product.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductRating.name, schema: ProductRatingSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
