import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class LocalizedTextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ka?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  en?: string;
}

export class UpdateServiceCenterDto {
  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  heroTitle?: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  content?: LocalizedTextDto;

  @ApiPropertyOptional({ example: '/imgs/service.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
