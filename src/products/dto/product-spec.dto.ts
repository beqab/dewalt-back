import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedTextDto } from '../../categories/dto/localized-text.dto';

export class ProductSpecDto {
  @ApiProperty({
    description: 'Specification label (localized)',
    example: { ka: 'სიმძლავრე', en: 'Power' },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label: LocalizedTextDto;

  @ApiProperty({
    description: 'Specification value (localized)',
    example: { ka: '720', en: '720' },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  value: LocalizedTextDto;
}
