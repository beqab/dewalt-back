import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class ReorderProductsDto {
  @ApiProperty({
    description:
      'Ordered array of product IDs. The index becomes the new sortOrder (when scoped by childCategoryId) or categorySortOrder (when scoped by categoryId).',
    example: [
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  productIds: string[];

  @ApiProperty({
    description:
      'Child category ID that owns the reordered products. Provide exactly one of childCategoryId or categoryId.',
    example: '507f1f77bcf86cd799439021',
    required: false,
  })
  @IsOptional()
  @ValidateIf((dto: ReorderProductsDto) => !dto.categoryId)
  @IsMongoId()
  childCategoryId?: string;

  @ApiProperty({
    description:
      'Category ID that owns the reordered products (used when no sub-category is selected). Provide exactly one of childCategoryId or categoryId.',
    example: '507f1f77bcf86cd799439031',
    required: false,
  })
  @IsOptional()
  @ValidateIf((dto: ReorderProductsDto) => !dto.childCategoryId)
  @IsMongoId()
  categoryId?: string;
}
