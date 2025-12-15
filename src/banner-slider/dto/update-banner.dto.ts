import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateBannerDto, LocalizedTextDto } from './create-banner.dto';
import { IsOptional } from 'class-validator';

export class UpdateBannerDto extends PartialType(CreateBannerDto) {
  @ApiProperty({
    description: 'Banner image URL',
    example: 'https://example.com/banner.jpg',
    required: false,
  })
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Banner title (localized)',
    example: { ka: 'ზაფხულის ფასდაკლება', en: 'Summer Sale' },
    required: false,
  })
  @IsOptional()
  title?: LocalizedTextDto;

  @ApiProperty({
    description: 'Banner description (localized)',
    example: {
      ka: '30%-მდე ფასდაკლება ყველა პროდუქტზე',
      en: 'Get up to 30% off on all products',
    },
    required: false,
  })
  @IsOptional()
  description?: LocalizedTextDto;

}
