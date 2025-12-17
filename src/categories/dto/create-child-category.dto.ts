import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
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
    description: 'Child category slug (URL-friendly identifier)',
    example: 'drills',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Parent Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  categoryId: string;
}
