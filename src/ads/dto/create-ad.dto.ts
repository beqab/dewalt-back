import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { AdPosition } from '../entities/ad.entity';

export class CreateAdDto {
  @ApiProperty({
    description: 'Ad image URL',
    example: 'https://example.com/ad-image.jpg',
  })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

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
  })
  @IsNotEmpty()
  @IsEnum(AdPosition)
  position: AdPosition;
}
