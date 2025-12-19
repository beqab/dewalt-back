import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsMongoId,
  IsOptional,
} from 'class-validator';
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
    description: 'Category slug (URL-friendly identifier, must be unique)',
    example: 'power-tools',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Brand IDs (optional, can be assigned later)',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  brandIds?: string[];
}
