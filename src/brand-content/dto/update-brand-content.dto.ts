import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class LocalizedTextDto {
  @ApiPropertyOptional({ example: 'ქართული ტექსტი' })
  @IsOptional()
  @IsString()
  ka?: string;

  @ApiPropertyOptional({ example: 'English text' })
  @IsOptional()
  @IsString()
  en?: string;
}

class BrandTextBlockDto {
  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  cardDescription?: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  aboutContent?: LocalizedTextDto;
}

export class UpdateBrandContentDto {
  @ApiPropertyOptional({ type: BrandTextBlockDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandTextBlockDto)
  dewalt?: BrandTextBlockDto;

  @ApiPropertyOptional({ type: BrandTextBlockDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandTextBlockDto)
  stanley?: BrandTextBlockDto;

  @ApiPropertyOptional({ type: BrandTextBlockDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandTextBlockDto)
  blackDecker?: BrandTextBlockDto;
}
