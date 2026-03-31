import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, ArrayMinSize } from 'class-validator';

export class ReorderCategoriesDto {
  @ApiProperty({
    description:
      'Ordered array of category IDs. The index in the array becomes the new sortOrder.',
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
  categoryIds: string[];
}
