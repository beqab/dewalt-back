import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from './localized-text.dto';

export class BrandResponseDto {
  @ApiProperty({ description: 'Brand ID', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({
    description: 'Brand name (localized)',
    example: { ka: 'დევოლტ', en: 'Dewalt' },
    type: LocalizedTextDto,
  })
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'Brand slug',
    example: 'dewalt',
  })
  slug: string;

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

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Category name (localized)',
    example: { ka: 'ელექტრო ხელსაწყოები', en: 'Power Tools' },
    type: LocalizedTextDto,
  })
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'Category slug',
    example: 'power-tools',
  })
  slug: string;

  @ApiProperty({
    description: 'Brand IDs (array of brand references)',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  brandIds: string[] | BrandResponseDto[];

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

export class ChildCategoryResponseDto {
  @ApiProperty({
    description: 'Child Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Child category name (localized)',
    example: { ka: 'ბურღები', en: 'Drills' },
    type: LocalizedTextDto,
  })
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'Child category slug',
    example: 'drills',
  })
  slug: string;

  @ApiProperty({
    description: 'Brand IDs (array of brand references)',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
    required: false,
  })
  brandIds?: string[] | BrandResponseDto[];

  @ApiProperty({
    description: 'Parent Category ID (optional)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  categoryId?: string | CategoryResponseDto;

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
