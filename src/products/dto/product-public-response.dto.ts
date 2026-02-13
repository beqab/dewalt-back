import { ApiProperty } from '@nestjs/swagger';

export class ProductCategoryRefPublicDto {
  @ApiProperty({ description: 'ID', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ description: 'Name (translated)', example: 'Dewalt' })
  name: string;

  @ApiProperty({ description: 'Slug', example: 'dewalt' })
  slug: string;
}

export class ProductSpecPublicDto {
  @ApiProperty({ description: 'Label (translated)', example: 'Power' })
  label: string;

  @ApiProperty({ description: 'Value (translated)', example: '700W' })
  value: string | number;
}

export class ProductPublicResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Product name (translated)',
    example: 'Angle Grinder',
  })
  name: string;

  @ApiProperty({ description: 'Product code', example: 'DWE4157' })
  code: string;

  @ApiProperty({
    description: 'Product description (translated)',
    example: 'Grinding and polishing tools',
  })
  description: string;

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

  @ApiProperty({ description: 'Current price', example: 1899 })
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

  @ApiProperty({ description: 'Product availability status', example: true })
  inStock: boolean;

  @ApiProperty({ description: 'Quantity', example: 1 })
  quantity: number;

  @ApiProperty({ description: 'Average rating', example: 4.5 })
  rating: number;

  @ApiProperty({ description: 'Number of reviews', example: 526 })
  reviewCount: number;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'angle-grinder-dwe4157',
  })
  slug: string;

  @ApiProperty({
    description: 'Brand information',
    type: ProductCategoryRefPublicDto,
  })
  brandId: ProductCategoryRefPublicDto;

  @ApiProperty({
    description: 'Category information',
    type: ProductCategoryRefPublicDto,
  })
  categoryId: ProductCategoryRefPublicDto;

  @ApiProperty({
    description: 'Child Category information (optional)',
    required: false,
    type: ProductCategoryRefPublicDto,
  })
  childCategoryId?: ProductCategoryRefPublicDto;

  @ApiProperty({
    description: 'Product specifications',
    type: [ProductSpecPublicDto],
  })
  specs: ProductSpecPublicDto[];

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
