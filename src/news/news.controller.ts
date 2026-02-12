import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import {
  PaginatedNewsResponseDto,
  PaginatedNewsPublicResponseDto,
  NewsDto,
  NewsPublicDto,
} from './dto/news-response.dto';
import { AdminAuthGuard } from '../guards/admin.guard';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all news articles (public endpoint with pagination)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'News articles retrieved successfully',
    type: PaginatedNewsResponseDto,
  })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    // Validate pagination parameters
    const validPage = isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
    const validLimit = isNaN(limitNumber) || limitNumber < 1 ? 10 : limitNumber;

    return this.newsService.findAll(validPage, validLimit);
  }

  @Get('public')
  @ApiOperation({
    summary:
      'Get all news articles (public translated endpoint with pagination)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'News articles retrieved successfully',
    type: PaginatedNewsPublicResponseDto,
  })
  findAllPublic(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    const validPage = isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
    const validLimit = isNaN(limitNumber) || limitNumber < 1 ? 10 : limitNumber;

    return this.newsService.findAllPublic(validPage, validLimit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single news article by ID (public endpoint)',
  })
  @ApiParam({ name: 'id', description: 'News article ID' })
  @ApiResponse({
    status: 200,
    description: 'News article retrieved successfully',
    type: NewsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'News article not found',
  })
  findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @Get('public/:id')
  @ApiOperation({
    summary: 'Get a single news article by ID (public translated endpoint)',
  })
  @ApiParam({ name: 'id', description: 'News article ID' })
  @ApiResponse({
    status: 200,
    description: 'News article retrieved successfully',
    type: NewsPublicDto,
  })
  @ApiResponse({
    status: 404,
    description: 'News article not found',
  })
  findOnePublic(@Param('id') id: string) {
    return this.newsService.findOnePublic(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new news article (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'News article created successfully',
    type: NewsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  create(@Body() createNewsDto: CreateNewsDto) {
    return this.newsService.create(createNewsDto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a news article by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'News article ID' })
  @ApiResponse({
    status: 200,
    description: 'News article updated successfully',
    type: NewsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'News article not found',
  })
  update(@Param('id') id: string, @Body() updateNewsDto: UpdateNewsDto) {
    return this.newsService.update(id, updateNewsDto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a news article by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'News article ID' })
  @ApiResponse({
    status: 204,
    description: 'News article deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'News article not found',
  })
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
