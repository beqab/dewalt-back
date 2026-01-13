import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdResponseDto } from './dto/ad-response.dto';
import { AdminAuthGuard } from '../guards/admin.guard';
import { AdPosition } from './entities/ad.entity';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all ads (public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Ads retrieved successfully',
    type: [AdResponseDto],
  })
  findAll() {
    return this.adsService.findAll();
  }

  @Get('by-position')
  @ApiOperation({ summary: 'Get ad by position (public endpoint)' })
  @ApiQuery({
    name: 'position',
    required: true,
    enum: AdPosition,
  })
  @ApiResponse({
    status: 200,
    description: 'Ad retrieved successfully',
    type: AdResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ad not found',
  })
  findByPosition(@Query('position') position: string) {
    return this.adsService.findByPosition(position);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single ad by ID (public endpoint)' })
  @ApiParam({ name: 'id', description: 'Ad ID' })
  @ApiResponse({
    status: 200,
    description: 'Ad retrieved successfully',
    type: AdResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ad not found',
  })
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new ad (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Ad created successfully',
    type: AdResponseDto,
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
    status: 409,
    description: 'Conflict - Ad with this position already exists',
  })
  create(@Body() createAdDto: CreateAdDto) {
    return this.adsService.create(createAdDto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an ad by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Ad ID' })
  @ApiResponse({
    status: 200,
    description: 'Ad updated successfully',
    type: AdResponseDto,
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
    description: 'Ad not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Ad with this position already exists',
  })
  update(@Param('id') id: string, @Body() updateAdDto: UpdateAdDto) {
    return this.adsService.update(id, updateAdDto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an ad by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Ad ID' })
  @ApiResponse({
    status: 204,
    description: 'Ad deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Ad not found',
  })
  remove(@Param('id') id: string) {
    return this.adsService.remove(id);
  }
}
