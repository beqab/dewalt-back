import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class SetChildCategoryGroupDto {
  @ApiProperty({
    description: 'Brand ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  brandId: string;

  @ApiProperty({
    description: 'Category ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty()
  @IsMongoId()
  categoryId: string;

  @ApiProperty({
    description: 'Child Category IDs assigned to this brand+category',
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    type: [String],
  })
  @IsArray()
  @IsMongoId({ each: true })
  childCategoryIds: string[];
}
