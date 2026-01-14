import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProductRating,
  ProductRatingDocument,
} from './entities/product-rating.entity';
import { Product, ProductDocument } from '../products/entities/product.entity';
import { RateProductDto } from './dto/rate-product.dto';
import { RatingStatsDto } from './dto/rating-stats.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(ProductRating.name)
    private ratingModel: Model<ProductRatingDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  /**
   * Rate a product (create or update existing rating)
   */
  async rateProduct(
    productId: string,
    rateProductDto: RateProductDto,
  ): Promise<RatingStatsDto> {
    try {
      // Validate product exists
      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if user has already rated this product
      const existingRating = await this.ratingModel.findOne({
        productId: new Types.ObjectId(productId),
        anonymousUserId: rateProductDto.anonymousUserId,
      });

      let oldRating: number | null = null;

      if (existingRating) {
        // Update existing rating
        oldRating = existingRating.rating;
        existingRating.rating = rateProductDto.rating;
        await existingRating.save();
      } else {
        // Create new rating
        await this.ratingModel.create({
          productId: new Types.ObjectId(productId),
          anonymousUserId: rateProductDto.anonymousUserId,
          rating: rateProductDto.rating,
        });
      }

      // Recalculate average rating and review count
      const stats = await this.calculateRatingStats(productId);

      // Update product document
      await this.productModel.findByIdAndUpdate(productId, {
        rating: stats.averageRating,
        reviewCount: stats.reviewCount,
      });

      return {
        ...stats,
        userRating: rateProductDto.rating,
      };
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(error);
    }
  }

  /**
   * Get rating statistics for a product
   */
  async getRatingStats(
    productId: string,
    anonymousUserId?: string,
  ): Promise<RatingStatsDto> {
    try {
      // Validate product exists
      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const stats = await this.calculateRatingStats(productId, anonymousUserId);

      return stats;
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(error);
    }
  }

  /**
   * Get user's rating for a product
   */
  async getUserRating(
    productId: string,
    anonymousUserId: string,
  ): Promise<number | null> {
    try {
      const rating = await this.ratingModel.findOne({
        productId: new Types.ObjectId(productId),
        anonymousUserId,
      });

      return rating ? rating.rating : null;
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(error);
    }
  }

  /**
   * Calculate average rating and review count for a product
   */
  private async calculateRatingStats(
    productId: string,
    anonymousUserId?: string,
  ): Promise<RatingStatsDto> {
    const ratings = await this.ratingModel.find({
      productId: new Types.ObjectId(productId),
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        reviewCount: 0,
        userRating: anonymousUserId
          ? ((await this.getUserRating(productId, anonymousUserId)) ??
            undefined)
          : undefined,
      };
    }

    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal

    const userRating = anonymousUserId
      ? await this.getUserRating(productId, anonymousUserId)
      : undefined;

    return {
      averageRating,
      reviewCount: ratings.length,
      userRating: userRating ?? undefined,
    };
  }
}
