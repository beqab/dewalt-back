import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin.guard';
import { UpdateBrandContentDto } from './dto/update-brand-content.dto';
import { BrandContent } from './entities/brand-content.entity';
import { BrandContentService } from './brand-content.service';

@ApiTags('brand-content')
@Controller('brand-content')
export class BrandContentController {
  constructor(private readonly brandContentService: BrandContentService) {}

  @Get()
  @ApiOperation({ summary: 'Get brand page content (public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Brand content retrieved successfully',
    type: BrandContent,
  })
  getBrandContent() {
    return this.brandContentService.getBrandContent();
  }

  @Patch()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update brand page content (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Brand content updated successfully',
    type: BrandContent,
  })
  updateBrandContent(@Body() dto: UpdateBrandContentDto) {
    return this.brandContentService.updateBrandContent(dto);
  }
}
