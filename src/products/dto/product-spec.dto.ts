import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { LocalizedTextDto } from '../../categories/dto/localized-text.dto';

export class ProductSpecDto {
  @ApiProperty({
    description: 'Specification label (localized)',
    example: { ka: 'სიმძლავრე', en: 'Power' },
    type: LocalizedTextDto,
  })
  @IsNotEmpty()
  label: LocalizedTextDto;

  @ApiProperty({
    description: 'Specification value (string or number)',
    example: 720,
  })
  @IsNotEmpty()
  value: string | number;

  @ApiProperty({
    description: 'Specification unit (optional)',
    example: 'W',
    required: false,
  })
  @IsOptional()
  @IsString()
  unit?: string;
}
