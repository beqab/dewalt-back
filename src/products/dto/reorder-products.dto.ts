import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

export class ReorderProductsDto {
  @ApiProperty({
    description:
      'Ordered array of product IDs within the selected child category. The index becomes the new sortOrder.',
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
    description: 'Child category ID that owns the reordered products.',
    example: '507f1f77bcf86cd799439021',
  })
  @IsMongoId()
  childCategoryId: string;
}
