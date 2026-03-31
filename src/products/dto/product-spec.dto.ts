import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OptionalLocalizedTextDto } from '../../categories/dto/optional-localized-text.dto';

export class ProductSpecDto {
  @ApiProperty({
    description: 'Specification label (localized)',
    example: { ka: 'სიმძლავრე', en: 'Power' },
    type: OptionalLocalizedTextDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptionalLocalizedTextDto)
  label: OptionalLocalizedTextDto;

  @ApiProperty({
    description: 'Specification value (localized)',
    example: { ka: '720', en: '720' },
    type: OptionalLocalizedTextDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptionalLocalizedTextDto)
  value: OptionalLocalizedTextDto;
}
