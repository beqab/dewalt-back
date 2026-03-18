import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class LocalizedTextDto {
  @ApiProperty({ example: 'Some Georgian text' })
  @IsOptional()
  @IsString()
  ka: string;

  @ApiProperty({ example: 'Some English text' })
  @IsOptional()
  @IsString()
  en: string;
}

export class CreateBannerDto {
  @ApiProperty({
    description: 'Banner image URL',
    example: 'https://example.com/banner.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl: string;

  @ApiProperty({
    description: 'Banner title (localized)',
    example: { ka: 'ზაფხულის ფასდაკლება', en: 'Summer Sale' },
  })
  @IsOptional()
  title: LocalizedTextDto;

  @ApiProperty({
    description: 'Banner description (localized)',
    example: {
      ka: '30%-მდე ფასდაკლება ყველა პროდუქტზე',
      en: 'Get up to 30% off on all products',
    },
  })
  @IsOptional()
  description: LocalizedTextDto;

  @ApiProperty({
    description: 'Button link URL',
    example: 'https://example.com/products',
    required: false,
  })
  @IsOptional()
  @IsString()
  buttonLink?: string;
}
