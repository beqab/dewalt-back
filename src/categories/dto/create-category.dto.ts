import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name (localized)',
    example: { ka: 'ელექტრო ხელსაწყოები', en: 'Power Tools' },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'Category slug (URL-friendly identifier)',
    example: 'power-tools',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Brand ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  brandId: string;
}
