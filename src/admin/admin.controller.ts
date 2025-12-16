import {
  Controller,
  Get,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { CurrentAdmin } from 'src/decorators/getCurrentAdmin';
import type { CurrentAdminType } from 'src/interceptors/current-admin.interceptor';
import { AdminAuthGuard } from 'src/guards/admin.guard';
import { CurrentAdminInterceptor } from 'src/interceptors/current-admin.interceptor';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({
    status: 200,
    description: 'List of all admins (passwords excluded)',
    type: [AdminResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  findAll() {
    return this.adminService.findAll();
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current admin' })
  @ApiResponse({
    status: 200,
    description: 'Current admin obtained successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  me(@CurrentAdmin() admin: CurrentAdminType) {
    console.log(admin, 'admin');
    return this.adminService.currentAdmin(admin.id);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  @ApiResponse({
    status: 200,
    description: 'Admin details (password excluded)',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Post('create-test-admin')
  @ApiOperation({ summary: 'Create test admin' })
  @ApiResponse({
    status: 200,
    description: 'Test admin created successfully',
    type: AdminResponseDto,
  })
  createTestAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createTestAdmin(createAdminDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login admin' })
  @ApiResponse({
    status: 200,
    description: 'Admin logged in successfully',
    type: AdminResponseDto,
  })
  login(@Body() loginDto: LoginAdminDto) {
    return this.adminService.login(loginDto);
  }

  @Post('get-token')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  getToken(@Body('refreshToken') refreshToken: string) {
    return this.adminService.getToken(refreshToken);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  @ApiResponse({
    status: 204,
    description: 'Admin deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout admin' })
  @ApiResponse({
    status: 200,
    description: 'Admin logged out successfully',
  })
  logout(
    @CurrentAdmin() admin: CurrentAdminType,
    @Body() body: { refreshToken?: string },
  ) {
    return this.adminService.logout(admin.id, false, body?.refreshToken);
  }
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  logoutAll(
    @CurrentAdmin() admin: CurrentAdminType,
    @Body() body: { refreshToken?: string; all?: boolean },
  ) {
    return this.adminService.logout(
      admin.id,
      body?.all || false,
      body.refreshToken,
    );
  }
}
