import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from './create-banner.dto';

export class BannerDto {
  @ApiProperty({
    description: 'Banner image URL',
    example: 'https://example.com/banner.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Banner title (localized)',
    example: { ka: 'ზაფხულის ფასდაკლება', en: 'Summer Sale' },
  })
  title: LocalizedTextDto;

  @ApiProperty({
    description: 'Banner description (localized)',
    example: {
      ka: '30%-მდე ფასდაკლება ყველა პროდუქტზე',
      en: 'Get up to 30% off on all products',
    },
  })
  description: LocalizedTextDto;

  @ApiProperty({
    description: 'Display order',
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: 'Button link URL',
    example: 'https://example.com/products',
    required: false,
  })
  buttonLink?: string;
}

export class BannerSliderResponseDto {
  @ApiProperty({
    description: 'Banner slider ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Array of banners',
    type: [BannerDto],
  })
  banners: BannerDto[];

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
