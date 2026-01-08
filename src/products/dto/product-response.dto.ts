import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../categories/dto/localized-text.dto';
import { ProductSpecDto } from './product-spec.dto';
import { BrandResponseDto } from '../../categories/dto/category-response.dto';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { ChildCategoryResponseDto } from '../../categories/dto/category-response.dto';

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Product name (localized)',
    example: { ka: 'კუთსახეხი', en: 'Angle Grinder' },
    type: LocalizedTextDto,
  })
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'Product code',
    example: 'DEW-86511 55 31321321641684 SRG-982',
  })
  code: string;

  @ApiProperty({
    description: 'Product description (localized)',
    example: {
      ka: 'სახეხი და საპრიალებელი ხელსაწყოები',
      en: 'Grinding and polishing tools',
    },
    type: LocalizedTextDto,
  })
  description: LocalizedTextDto;

  @ApiProperty({
    description: 'Main product image URL',
    example: '/imgs/product.png',
  })
  image: string;

  @ApiProperty({
    description: 'Additional product images',
    example: ['/imgs/product-1.png', '/imgs/product-2.png'],
    type: [String],
    required: false,
  })
  images?: string[];

  @ApiProperty({
    description: 'Current price',
    example: 1899,
  })
  price: number;

  @ApiProperty({
    description: 'Original price before discount',
    example: 2399,
    required: false,
  })
  originalPrice?: number;

  @ApiProperty({
    description: 'Discount percentage',
    example: 21,
    required: false,
  })
  discount?: number;

  @ApiProperty({
    description: 'Product availability status',
    example: true,
  })
  inStock: boolean;

  @ApiProperty({
    description: 'Average rating',
    example: 4.5,
  })
  rating: number;

  @ApiProperty({
    description: 'Number of reviews',
    example: 526,
  })
  reviewCount: number;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'angle-grinder-dew-86511',
  })
  slug: string;

  @ApiProperty({
    description: 'Brand information',
    type: BrandResponseDto,
  })
  brandId: string | BrandResponseDto;

  @ApiProperty({
    description: 'Category information',
    type: CategoryResponseDto,
  })
  categoryId: string | CategoryResponseDto;

  @ApiProperty({
    description: 'Child Category information (optional)',
    type: ChildCategoryResponseDto,
    required: false,
  })
  childCategoryId?: string | ChildCategoryResponseDto;

  @ApiProperty({
    description: 'Product specifications',
    type: [ProductSpecDto],
  })
  specs: ProductSpecDto[];

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
