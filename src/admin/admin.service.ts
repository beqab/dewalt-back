import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Admin, AdminDocument } from './entities/admin.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginAdminDto } from './dto/login-admin.dto';
import { ConfigService } from '@nestjs/config';

export type AdminResponse = Omit<Admin, 'password'> & { _id?: any };

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async findAll(): Promise<AdminDocument[]> {
    const admins = await this.adminModel.find().select('-password').exec();
    return admins;
  }

  async findOne(id: string): Promise<AdminDocument> {
    const admin = await this.adminModel.findById(id).select('-password').exec();

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return admin;
  }

  async findByUsername(username: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ email }).exec();
  }

  async createTestAdmin(createAdminDto: CreateAdminDto) {
    try {
      // Check if test admin already exists
      const existingAdmin = await this.adminModel.findOne({
        username: createAdminDto.username,
      });
      if (existingAdmin) {
        return {
          message: 'Test admin already exists',
          admin: existingAdmin,
        };
      }

      // Create test admin with static data
      const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

      const testAdmin = new this.adminModel({
        username: createAdminDto.username,
        password: hashedPassword,
        refreshToken: [],
      });
      console.log(testAdmin, 'testAdmin');

      const savedAdmin = await testAdmin.save();
      const { password, ...adminWithoutPassword } = savedAdmin.toObject();

      return {
        message: 'Test admin created successfully',
        admin: adminWithoutPassword,
        credentials: {
          username: createAdminDto.username,
          password: createAdminDto.password,
        },
      };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async login({ username, password }: LoginAdminDto) {
    try {
      // Find admin with password included for verification
      const admin = await this.adminModel.findOne({ username });

      if (!admin) {
        throw new BadRequestException('Invalid credentials');
      }

      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (!passwordMatch) {
        throw new BadRequestException('Invalid credentials');
      }

      const refreshToken = this.jwtService.sign(
        {
          adminId: admin._id,
          username: admin.username,
        },
        {
          expiresIn: '7d',
        },
      );

      // Update admin with refresh token
      await this.adminModel.findByIdAndUpdate(admin._id, {
        $push: { refreshToken },
      });

      const token = this.jwtService.sign(
        {
          adminId: admin._id as string,
          username: admin.username,
        },
        {
          expiresIn: '30m',
        },
      );

      // Calculate expiration timestamp for access token
      const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Get admin without password for response
      const result = await this.adminModel
        .findById(admin._id)
        .select('-password')
        .lean();

      console.log(
        {
          admin: result,
          token,
          tokenExpiresAt,
          refreshToken,
        },
        'result login',
      );
      return {
        admin: result,
        token,
        tokenExpiresAt,
        refreshToken,
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException('Login failed');
    }
  }

  async currentAdmin(adminId: string) {
    try {
      const adminData = await this.adminModel
        .findById(adminId)
        .select('-password -refreshToken')
        .lean();

      if (!adminData) {
        throw new NotFoundException('Admin not found');
      }

      return {
        admin: adminData,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get admin');
    }
  }

  async getToken(refreshToken: string) {
    try {
      console.log(refreshToken, 'refreshToken');
      // Verify and decode the refresh token
      const decoded: { adminId: string } = this.jwtService.verify(
        refreshToken,
        {
          secret: this.configService.get<string>('ADMIN_ACCESS_SECRET'),
        },
      );

      console.log(
        'blabla from admin.service.ts',
        this.configService.get<string>('ADMIN_ACCESS_SECRET'),
      );

      console.log(decoded, 'decoded');

      const admin = await this.adminModel.findById(decoded.adminId);

      console.log(
        admin,
        'admin from admin.service.ts',
        admin?.refreshToken.indexOf(refreshToken),
      );

      if (!admin || admin.refreshToken.indexOf(refreshToken) === -1) {
        throw new BadRequestException('Invalid refresh token');
      }

      const adminId = admin._id as string;

      // Generate new access token
      const newToken = this.jwtService.sign(
        {
          adminId,
          username: admin.username,
        },
        {
          expiresIn: '30m',
        },
      );

      const newRefreshToken = this.jwtService.sign(
        {
          adminId,
          username: admin.username,
        },
        {
          expiresIn: '7d',
        },
      );

      // Replace the used refresh token in the admin's refreshToken array with the new one
      const updatedRefreshTokens = (admin.refreshToken || []).map(
        (token: string) => (token === refreshToken ? newRefreshToken : token),
      );

      await this.adminModel.findByIdAndUpdate(adminId, {
        refreshToken: updatedRefreshTokens,
      });

      const result = await this.adminModel
        .findById(adminId)
        .select('-password')
        .lean();

      return {
        message: 'Token refreshed successfully',
        token: newToken,
        tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshToken: newRefreshToken,
        admin: result,
      };
    } catch (error) {
      console.log(error, 'error');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Token refresh failed');
    }
  }

  async update(
    id: string,
    updateAdminDto: UpdateAdminDto,
  ): Promise<AdminResponse> {
    const admin = await this.adminModel.findByIdAndUpdate(id, updateAdminDto, {
      new: true,
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return admin as AdminResponse;
  }

  async remove(id: string): Promise<void> {
    const result = await this.adminModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
  }

  async logout(
    adminId: string,
    all: boolean = false,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    try {
      const admin = await this.adminModel.findById(adminId);

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      let updatedRefreshTokens: string[];

      if (all) {
        // Remove all refresh tokens (logout from all devices)
        updatedRefreshTokens = [];
      } else {
        // Remove specific refresh token
        if (!refreshToken) {
          throw new BadRequestException(
            'Refresh token is required when logging out from a single device',
          );
        }

        // Filter out the specific refresh token
        updatedRefreshTokens = (admin.refreshToken || []).filter(
          (token: string) => token !== refreshToken,
        );
      }

      await this.adminModel.findByIdAndUpdate(adminId, {
        refreshToken: updatedRefreshTokens,
      });

      return {
        message: all
          ? 'Logged out from all devices successfully'
          : 'Logout successful',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Logout failed');
    }
  }
}
