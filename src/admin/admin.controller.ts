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
  Res,
  Req,
  Query,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { CurrentAdmin } from '../decorators/getCurrentAdmin';
import type { CurrentAdminType } from '../interceptors/current-admin.interceptor';
import { AdminAuthGuard } from '../guards/admin.guard';
import { CurrentAdminInterceptor } from '../interceptors/current-admin.interceptor';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users (paginated, admin only)',
    description:
      'Supports pagination and email search via `search` query param.',
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
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by email (contains, case-insensitive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
  })
  findAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(String(page), 10) : 1;
    const limitNum = limit ? parseInt(String(limit), 10) : 10;
    return this.adminService.findAllUsers({
      page: Number.isFinite(pageNum) ? pageNum : 1,
      limit: Number.isFinite(limitNum) ? limitNum : 10,
      search: search ? String(search) : undefined,
    });
  }

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
  async login(
    @Body() loginDto: LoginAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminService.login(loginDto);

    // Set refresh token as HTTP-only cookie
    console.log(result.refreshToken, 'result.refreshToken');
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    });

    // Return refreshToken in response body ONLY for NextAuth server-side storage
    // It will be stored in JWT and used for server-side refresh calls
    // This is a trade-off: we need it server-side, but it's stored in JWT (not accessible via JS)
    return result;
  }

  @Post('get-token')
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
  async getToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('🔄 start refresh StartIcon');

    // Log request headers to debug
    console.log('Request headers:', req.headers.cookie);
    console.log('Request cookies object:', req.cookies);

    // Try to read from cookies first (when browser sends automatically)
    let refreshToken = (req.cookies as { refresh_token?: string })
      ?.refresh_token;

    console.log(refreshToken, 'refreshToken');

    // If not in cookies, try to parse from Cookie header manually
    // This handles cases where cookies are forwarded manually from server-side requests
    if (!refreshToken && req.headers.cookie) {
      const cookieHeader = req.headers.cookie;
      const match = cookieHeader.match(/refresh_token=([^;]+)/);
      if (match) {
        refreshToken = match[1];
        console.log(
          'Found refresh token in Cookie header:',
          refreshToken.substring(0, 20) + '...',
        );
      }
    }

    console.log(
      'Final refreshToken:',
      refreshToken ? refreshToken.substring(0, 20) + '...' : 'undefined',
    );

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new BadRequestException('Refresh token not found');
    }

    const result = await this.adminService.getToken(refreshToken);

    // Set new refresh token as HTTP-only cookie
    // res.cookie('refresh_token', result.refreshToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    //   path: '/',
    // });

    // Return refreshToken in response body for NextAuth to update JWT
    // It will be stored in JWT and used for server-side refresh calls
    return result;
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
  @ApiOperation({ summary: 'Logout admin (single device)' })
  @ApiResponse({
    status: 200,
    description: 'Admin logged out successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  async logout(
    @CurrentAdmin() admin: CurrentAdminType,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Read refresh token from cookie
    const refreshToken = (req.cookies as { refresh_token?: string })
      ?.refresh_token;

    const result = await this.adminService.logout(
      admin.id,
      false,
      refreshToken,
    );

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return result;
  }

  @Post('logout-all')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout admin from all devices' })
  @ApiResponse({
    status: 200,
    description: 'Admin logged out from all devices successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  async logoutAll(
    @CurrentAdmin() admin: CurrentAdminType,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminService.logout(admin.id, true);

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return result;
  }
}
