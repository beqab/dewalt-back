import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LocalizedTextDto {
  @ApiProperty({ example: 'Some Georgian text' })
  @IsNotEmpty()
  @IsString()
  ka: string;

  @ApiProperty({ example: 'Some English text' })
  @IsNotEmpty()
  @IsString()
  en: string;
}

