import { ApiProperty } from '@nestjs/swagger';
import { AdPosition } from '../entities/ad.entity';

export class AdResponseDto {
  @ApiProperty({ description: 'Ad ID', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({
    description: 'Ad image URL',
    example: 'https://example.com/ad-image.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Ad link URL (optional)',
    example: 'https://example.com/product',
    required: false,
  })
  urlLink?: string;

  @ApiProperty({
    description: 'Ad position',
    enum: AdPosition,
    example: AdPosition.MAIN_PAGE,
  })
  position: AdPosition;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
