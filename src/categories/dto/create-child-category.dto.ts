import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsArray,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateChildCategoryDto {
  @ApiProperty({
    description: 'Child category name (localized)',
    example: { ka: 'ბურღები', en: 'Drills' },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  name: LocalizedTextDto;

  @ApiProperty({
    description:
      'Child category slug (URL-friendly identifier, must be unique)',
    example: 'drills',
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

  @ApiProperty({
    description: 'Parent Category ID (optional, can be assigned later)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;
}
