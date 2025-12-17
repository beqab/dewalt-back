import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LocalizedTextDto {
  @ApiProperty({
    description: 'Text in Georgian',
    example: 'დევოლტ',
  })
  @IsNotEmpty()
  @IsString()
  ka: string;

  @ApiProperty({
    description: 'Text in English',
    example: 'Dewalt',
  })
  @IsNotEmpty()
  @IsString()
  en: string;
}
