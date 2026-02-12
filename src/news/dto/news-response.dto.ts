import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from './localized-text.dto';

export class NewsDto {
  @ApiProperty({
    description: 'News article ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'News image URL',
    example: 'https://example.com/news-image.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'News title (localized)',
    example: { ka: 'სიახლეების სათაური', en: 'News Title' },
  })
  title: LocalizedTextDto;

  @ApiProperty({
    description: 'News summary/short description (localized)',
    example: {
      ka: 'სიახლეების მოკლე აღწერა',
      en: 'News short description',
    },
  })
  summary: LocalizedTextDto;

  @ApiProperty({
    description: 'News full content/article text (localized)',
    example: {
      ka: 'სიახლეების სრული ტექსტი...',
      en: 'News full content text...',
    },
  })
  content: LocalizedTextDto;

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

export class NewsPublicDto {
  @ApiProperty({
    description: 'News article ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'News image URL',
    example: 'https://example.com/news-image.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'News title (translated)',
    example: 'News Title',
  })
  title: string;

  @ApiProperty({
    description: 'News summary/short description (translated)',
    example: 'News short description',
  })
  summary: string;

  @ApiProperty({
    description: 'News full content/article text (translated)',
    example: 'News full content text...',
  })
  content: string;

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

export class PaginatedNewsResponseDto {
  @ApiProperty({ description: 'List of news articles', type: [NewsDto] })
  data: NewsDto[];

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of news articles', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;
}

export class PaginatedNewsPublicResponseDto {
  @ApiProperty({ description: 'List of news articles', type: [NewsPublicDto] })
  data: NewsPublicDto[];

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of news articles', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;
}
