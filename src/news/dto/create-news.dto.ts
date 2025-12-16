import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateNewsDto {
  @ApiProperty({
    description: 'News image URL',
    example: 'https://example.com/news-image.jpg',
  })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @ApiProperty({
    description: 'News title (localized)',
    example: { ka: 'სიახლეების სათაური', en: 'News Title' },
  })
  @IsNotEmpty()
  title: LocalizedTextDto;

  @ApiProperty({
    description: 'News summary/short description (localized)',
    example: {
      ka: 'სიახლეების მოკლე აღწერა',
      en: 'News short description',
    },
  })
  @IsNotEmpty()
  summary: LocalizedTextDto;

  @ApiProperty({
    description: 'News full content/article text (localized)',
    example: {
      ka: 'სიახლეების სრული ტექსტი...',
      en: 'News full content text...',
    },
  })
  @IsNotEmpty()
  content: LocalizedTextDto;
}

