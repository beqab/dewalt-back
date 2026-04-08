import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class LocalizedTextDto {
  @ApiPropertyOptional({ example: '<h2>პირობები</h2><p>...</p>' })
  @IsOptional()
  @IsString()
  ka?: string;

  @ApiPropertyOptional({ example: '<h2>Terms</h2><p>...</p>' })
  @IsOptional()
  @IsString()
  en?: string;
}

export class UpdateTermsDto {
  @ApiPropertyOptional({
    example: { ka: '<p>...</p>', en: '<p>...</p>' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  content?: LocalizedTextDto;
}
