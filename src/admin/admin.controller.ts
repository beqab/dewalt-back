import {
  Controller,
  Get,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { LoginAdminDto } from './dto/login-admin.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({
    status: 200,
    description: 'List of all admins (passwords excluded)',
    type: [AdminResponseDto],
  })
  findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  @ApiResponse({
    status: 200,
    description: 'Admin details (password excluded)',
    type: AdminResponseDto,
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
  @ApiOperation({ summary: 'Get token' })
  @ApiResponse({
    status: 200,
    description: 'Token obtained successfully',
  })
  getToken(@Body('refreshToken') refreshToken: string) {
    return this.adminService.getToken(refreshToken);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  @ApiResponse({
    status: 204,
    description: 'Admin deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
