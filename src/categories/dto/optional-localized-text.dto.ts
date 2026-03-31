import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OptionalLocalizedTextDto {
  @ApiProperty({
    description: 'Text in Georgian',
    example: 'დევოლტ',
    required: false,
    default: '',
  })
  @IsOptional()
  @IsString()
  ka: string;

  @ApiProperty({
    description: 'Text in English',
    example: 'Dewalt',
    required: false,
    default: '',
  })
  @IsOptional()
  @IsString()
  en: string;
}
