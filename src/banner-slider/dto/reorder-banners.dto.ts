import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBannerDto } from './create-banner.dto';

export class ReorderBannersDto {
  @ApiProperty({
    description: 'Array of banners in the new order',
    type: [CreateBannerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBannerDto)
  banners: CreateBannerDto[];
}

