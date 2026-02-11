import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateNewsDto } from './create-news.dto';
import { LocalizedTextDto } from './localized-text.dto';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {
  @ApiProperty({
    description: 'News image URL',
    example: 'https://example.com/news-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'News title (localized)',
    example: { ka: 'სიახლეების სათაური', en: 'News Title' },
    required: false,
  })
  @IsOptional()
  title?: LocalizedTextDto;

  @ApiProperty({
    description: 'News summary/short description (localized)',
    example: {
      ka: 'სიახლეების მოკლე აღწერა',
      en: 'News short description',
    },
    required: false,
  })
  @IsOptional()
  summary?: LocalizedTextDto;

  @ApiProperty({
    description: 'News full content/article text (localized)',
    example: {
      ka: 'სიახლეების სრული ტექსტი...',
      en: 'News full content text...',
    },
    required: false,
  })
  @IsOptional()
  content?: LocalizedTextDto;
}
