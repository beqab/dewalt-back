import { ApiProperty } from '@nestjs/swagger';

export class RatingStatsDto {
  @ApiProperty({
    description: 'Average rating',
    example: 4.5,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total number of ratings',
    example: 42,
  })
  reviewCount: number;

  @ApiProperty({
    description: "User's current rating (if provided anonymousUserId)",
    example: 5,
    required: false,
  })
  userRating?: number;
}
