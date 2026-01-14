import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { RateProductDto } from './dto/rate-product.dto';
import { RatingStatsDto } from './dto/rating-stats.dto';

@ApiTags('ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rate a product (create or update rating)' })
  @ApiResponse({
    status: 200,
    description: 'Rating submitted successfully',
    type: RatingStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Invalid rating value' })
  rateProduct(
    @Param('id') productId: string,
    @Body() rateProductDto: RateProductDto,
  ): Promise<RatingStatsDto> {
    console.log(rateProductDto, 'rateProductDto');
    return this.ratingsService.rateProduct(productId, rateProductDto);
  }

  @Get(':id/rating-stats')
  @ApiOperation({ summary: 'Get rating statistics for a product' })
  @ApiQuery({
    name: 'anonymousUserId',
    required: false,
    type: String,
    description: "Anonymous user ID to get user's rating",
  })
  @ApiResponse({
    status: 200,
    description: 'Rating statistics retrieved successfully',
    type: RatingStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getRatingStats(
    @Param('id') productId: string,
    @Query('anonymousUserId') anonymousUserId?: string,
  ): Promise<RatingStatsDto> {
    return this.ratingsService.getRatingStats(productId, anonymousUserId);
  }

  @Get(':id/my-rating')
  @ApiOperation({ summary: "Get current user's rating for a product" })
  @ApiQuery({
    name: 'anonymousUserId',
    required: true,
    type: String,
    description: 'Anonymous user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User rating retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        rating: {
          type: 'number',
          nullable: true,
          description: "User's rating (1-5) or null if not rated",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getMyRating(
    @Param('id') productId: string,
    @Query('anonymousUserId') anonymousUserId: string,
  ): Promise<{ rating: number | null }> {
    console.log(anonymousUserId, 'anonymousUserId');
    const rating = await this.ratingsService.getUserRating(
      productId,
      anonymousUserId,
    );
    return { rating };
  }
}
