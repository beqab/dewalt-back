import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin.guard';
import { UpdateServiceCenterDto } from './dto/update-service-center.dto';
import { ServiceCenter } from './entities/service-center.entity';
import { ServiceCenterService } from './service-center.service';

@ApiTags('service-center')
@Controller('service-center')
export class ServiceCenterController {
  constructor(private readonly serviceCenterService: ServiceCenterService) {}

  @Get()
  @ApiOperation({ summary: 'Get service center page content (public)' })
  @ApiResponse({ status: 200, description: 'OK', type: ServiceCenter })
  getServiceCenter() {
    return this.serviceCenterService.getServiceCenter();
  }

  @Patch()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update service center (admin only)' })
  @ApiResponse({ status: 200, description: 'OK', type: ServiceCenter })
  updateServiceCenter(@Body() dto: UpdateServiceCenterDto) {
    return this.serviceCenterService.updateServiceCenter(dto);
  }
}
