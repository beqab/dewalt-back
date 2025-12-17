import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateBrandDto {
  @ApiProperty({
    description: 'Brand name (localized)',
    example: { ka: 'დევოლტ', en: 'Dewalt' },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'Brand slug (URL-friendly identifier)',
    example: 'dewalt',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;
}
