import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class LocalizedTextDto {
  @ApiPropertyOptional({ example: 'თბილისი, ...' })
  @IsOptional()
  @IsString()
  ka?: string;

  @ApiPropertyOptional({ example: 'Tbilisi, ...' })
  @IsOptional()
  @IsString()
  en?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: '+995 555 12 34 56' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '+995 555 99 88 77' })
  @IsOptional()
  @IsString()
  contactPhone2?: string;

  @ApiPropertyOptional({ example: 'info@dewalt.ge' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/dewalt' })
  @IsOptional()
  @IsString()
  contactFacebook?: string;

  @ApiPropertyOptional({
    example: { ka: 'თბილისი, ...', en: 'Tbilisi, ...' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  contactAddress?: LocalizedTextDto;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryTbilisiPrice?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryTbilisiFreeOver?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryRegionPrice?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryRegionFreeOver?: number;
}
