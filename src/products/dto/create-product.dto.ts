import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsInt,
  IsMongoId,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedTextDto } from '../../categories/dto/localized-text.dto';
import { ProductSpecDto } from './product-spec.dto';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name (localized)',
    example: { ka: 'კუთსახეხი', en: 'Angle Grinder' },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'Product code (unique identifier)',
    example: 'DEW-86511 55 31321321641684 SRG-982',
  })
  @IsOptional()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'FINA product id (optional)',
    example: 12345,
    required: false,
  })
  @IsOptional()
  @IsInt()
  finaId?: number;

  @ApiProperty({
    description: 'FINA product code (optional)',
    example: 'FINA-ABC-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  finaCode?: string;

  @ApiProperty({
    description: 'Product description (localized)',
    example: {
      ka: 'სახეხი და საპრიალებელი ხელსაწყოები',
      en: 'Grinding and polishing tools',
    },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto;

  @ApiProperty({
    description: 'Main product image URL',
    example: '/imgs/product.png',
  })
  @IsNotEmpty()
  @IsString()
  image: string;

  @ApiProperty({
    description: 'Additional product images (optional)',
    example: ['/imgs/product-1.png', '/imgs/product-2.png'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Current price',
    example: 1899,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Original price before discount (optional)',
    example: 2399,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiProperty({
    description: 'Discount percentage (0-100)',
    example: 21,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  @ApiProperty({
    description: 'Product availability status',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiProperty({
    description: 'Stock quantity',
    example: 50,
    minimum: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({
    description: 'Average rating (0-5)',
    example: 4.5,
    minimum: 0,
    maximum: 5,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiProperty({
    description: 'Number of reviews',
    example: 526,
    minimum: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number;

  @ApiProperty({
    description: 'URL-friendly slug (unique identifier)',
    example: 'angle-grinder-dew-86511',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Brand ID (reference to Brand)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  brandId: string;

  @ApiProperty({
    description: 'Category ID (reference to Category)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty()
  @IsMongoId()
  categoryId: string;

  @ApiProperty({
    description: 'Child Category ID (optional, reference to ChildCategory)',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  childCategoryId?: string;

  @ApiProperty({
    description: 'Product specifications',
    example: [
      {
        label: { ka: 'სიმძლავრე', en: 'Power' },
        value: { ka: '720', en: '720' },
      },
    ],
    type: [ProductSpecDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];
}
