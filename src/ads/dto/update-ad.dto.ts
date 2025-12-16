import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CreateAdDto } from './create-ad.dto';
import { AdPosition } from '../entities/ad.entity';

export class UpdateAdDto extends PartialType(CreateAdDto) {
  @ApiProperty({
    description: 'Ad image URL',
    example: 'https://example.com/ad-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Ad link URL (optional)',
    example: 'https://example.com/product',
    required: false,
  })
  @IsOptional()
  @IsString()
  urlLink?: string;

  @ApiProperty({
    description: 'Ad position',
    enum: AdPosition,
    example: AdPosition.MAIN_PAGE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AdPosition)
  position?: AdPosition;
}
