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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BannerSliderService } from './banner-slider.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerSliderResponseDto } from './dto/banner-slider-response.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { AdminAuthGuard } from '../guards/admin.guard';

@ApiTags('banner-slider')
@Controller('banner-slider')
export class BannerSliderController {
  constructor(private readonly bannerSliderService: BannerSliderService) {}

  @Get()
  @ApiOperation({ summary: 'Get all banners (public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Banner slider retrieved successfully',
    type: BannerSliderResponseDto,
  })
  findAll() {
    return this.bannerSliderService.findAll();
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a new banner (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Banner added successfully',
    type: BannerSliderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input or order conflict',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannerSliderService.create(createBannerDto);
  }

  @Patch(':order')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a banner by order (admin only)' })
  @ApiParam({
    name: 'order',
    description: 'Banner order number',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Banner updated successfully',
    type: BannerSliderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input or order conflict',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Banner not found',
  })
  update(
    @Param('order') order: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.bannerSliderService.update(order, updateBannerDto);
  }

  @Delete(':order')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a banner by order (admin only)' })
  @ApiParam({
    name: 'order',
    description: 'Banner order number',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Banner deleted successfully',
    type: BannerSliderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid order',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Banner not found',
  })
  remove(@Param('order') order: string) {
    return this.bannerSliderService.remove(order);
  }

  @Post('reorder')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reorder all banners by sending new array (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Banners reordered successfully',
    type: BannerSliderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  reorder(@Body() reorderBannersDto: ReorderBannersDto) {
    return this.bannerSliderService.reorder(reorderBannersDto.banners);
  }
}
