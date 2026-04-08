import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin.guard';
import { UpdateTermsDto } from './dto/update-terms.dto';
import { Terms } from './entities/terms.entity';
import { TermsService } from './terms.service';

@ApiTags('terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  @ApiOperation({ summary: 'Get terms page content (public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Terms content retrieved successfully',
    type: Terms,
  })
  getTerms() {
    return this.termsService.getTerms();
  }

  @Patch()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update terms content (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Terms content updated successfully',
    type: Terms,
  })
  updateTerms(@Body() dto: UpdateTermsDto) {
    return this.termsService.updateTerms(dto);
  }
}
