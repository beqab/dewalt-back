import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserDocument } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        email: registerDto.email.toLowerCase(),
      });

      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Create user
      const verificationToken = randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const user = await this.userModel.create({
        name: registerDto.name,
        surname: registerDto.surname,
        email: registerDto.email.toLowerCase(),
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      if (!user || !user._id) {
        throw new BadRequestException('Failed to create user');
      }

      // Generate tokens
      const tokens = this.generateTokens(
        (user._id as { toString(): string }).toString(),
        user.email,
      );

      // Update user with refresh token
      await this.userModel.findByIdAndUpdate(user._id, {
        $push: { refreshTokens: tokens.refreshToken },
      });

      await this.sendVerificationEmail(user.email, verificationToken);

      // Get user without password
      const userResponse = await this.userModel
        .findById(user._id)
        .select(
          '-password -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires',
        )
        .lean();

      return {
        user: userResponse as unknown as UserResponseDto,
        ...tokens,
      };
    } catch (error) {
      console.log(error, 'error registration');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Find user with email
      const user = await this.userModel.findOne({
        email: loginDto.email.toLowerCase(),
      });

      if (!user) {
        throw new BadRequestException('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException('Please verify your email first');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!passwordMatch) {
        throw new BadRequestException('Invalid credentials');
      }

      // Generate tokens
      const tokens = this.generateTokens(
        (user._id as { toString(): string }).toString(),
        user.email,
      );

      // Update user with refresh token
      await this.userModel.findByIdAndUpdate(user._id, {
        $push: { refreshTokens: tokens.refreshToken },
      });

      // Get user without password
      const userResponse = await this.userModel
        .findById(user._id)
        .select(
          '-password -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires',
        )
        .lean();

      return {
        user: userResponse as unknown as UserResponseDto,
        ...tokens,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Login failed');
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.userModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return { message: 'Email verified successfully' };
  }

  private async sendVerificationEmail(email: string, token: string) {
    const resendKey = this.configService.get<string>('RESEND_EMAIL_KEY');
    if (!resendKey) {
      throw new BadRequestException('RESEND_EMAIL_KEY is not configured');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const frontUrl = this.configService.get<string>('FRONT_URL') || '';
    const normalizedFrontUrl = frontUrl.endsWith('/')
      ? frontUrl
      : `${frontUrl}/`;
    const verifyUrl = `${normalizedFrontUrl}ka/verify-email?token=${token}`;
    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'onboarding@resend.dev';

    const testRecipient = this.configService.get<string>('RESEND_TEST_EMAIL');
    const recipientEmail =
      nodeEnv !== 'production' && testRecipient ? testRecipient : email;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: 'Verify your email',
        html: `<p>Welcome to Dewalt.</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>${
          recipientEmail !== email ? `<p>Intended recipient: ${email}</p>` : ''
        }`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (nodeEnv !== 'production') {
        console.error(
          `Failed to send verification email: ${errorText}. Verify link: ${verifyUrl}`,
        );
        return;
      }
      throw new BadRequestException(
        `Failed to send verification email: ${errorText}`,
      );
    }
  }

  async requestPasswordReset(
    requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userModel.findOne({
        email: requestPasswordResetDto.email.toLowerCase(),
      });

      if (!user) {
        // Don't reveal if user exists for security
        return {
          message:
            'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token
      await this.userModel.findByIdAndUpdate(user._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry,
      });
      await this.sendPasswordResetEmail(user.email, resetToken);

      console.log('Password reset email sent');
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    } catch (error) {
      throw new BadRequestException('Password reset request failed');
    }
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      // Find user by reset token
      const user = await this.userModel.findOne({
        passwordResetToken: resetPasswordDto.token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);

      // Update password and clear reset token
      await this.userModel.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        $set: { refreshTokens: [] }, // Invalidate all refresh tokens
      });

      return {
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Password reset failed');
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!passwordMatch) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(
        changePasswordDto.newPassword,
        10,
      );

      // Update password and invalidate all refresh tokens
      await this.userModel.findByIdAndUpdate(userId, {
        password: hashedPassword,
        $set: { refreshTokens: [] },
      });

      return {
        message: 'Password has been changed successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Password change failed');
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ token: string; tokenExpiresAt: Date }> {
    try {
      const secret = this.configService.get<string>('USER_REFRESH_SECRET');
      const payload = this.jwtService.verify<{ userId: string; email: string }>(
        refreshToken,
        { secret },
      );

      // Find user and verify refresh token exists
      const user = await this.userModel.findById(payload.userId);

      if (!user || !user.refreshTokens.includes(refreshToken)) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate new access token
      const accessToken = this.jwtService.sign(
        {
          userId: (user._id as { toString(): string }).toString(),
          email: user.email,
        },
        {
          secret: this.configService.get<string>('USER_ACCESS_SECRET'),
          expiresIn: '30m',
        },
      );

      const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

      return {
        token: accessToken,
        tokenExpiresAt,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(
    userId: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken },
      });

      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      throw new BadRequestException('Logout failed');
    }
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    try {
      const user = await this.userModel
        .findById(userId)
        .select(
          '-password -refreshTokens -passwordResetToken -passwordResetExpires',
        )
        .lean();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user as unknown as UserResponseDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get user');
    }
  }

  private generateTokens(
    userId: string,
    email: string,
  ): { token: string; tokenExpiresAt: Date; refreshToken: string } {
    const accessTokenSecret =
      this.configService.get<string>('USER_ACCESS_SECRET');
    const refreshTokenSecret = this.configService.get<string>(
      'USER_REFRESH_SECRET',
    );

    const accessToken = this.jwtService.sign(
      {
        userId,
        email,
      },
      {
        secret: accessTokenSecret,
        expiresIn: '30m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        userId,
        email,
      },
      {
        secret: refreshTokenSecret,
        expiresIn: '7d',
      },
    );

    const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return {
      token: accessToken,
      tokenExpiresAt,
      refreshToken,
    };
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    const resendKey = this.configService.get<string>('RESEND_EMAIL_KEY');
    if (!resendKey) {
      throw new BadRequestException('RESEND_EMAIL_KEY is not configured');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const frontUrl = this.configService.get<string>('FRONT_URL') || '';
    const normalizedFrontUrl = frontUrl.endsWith('/')
      ? frontUrl
      : `${frontUrl}/`;
    const resetUrl = `${normalizedFrontUrl}ka/reset-password?token=${token}`;
    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'onboarding@resend.dev';

    const testRecipient = this.configService.get<string>('RESEND_TEST_EMAIL');
    const recipientEmail =
      nodeEnv !== 'production' && testRecipient ? testRecipient : email;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: 'Reset your password',
        html: `<p>You requested a password reset.</p><p>Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>${
          recipientEmail !== email ? `<p>Intended recipient: ${email}</p>` : ''
        }`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (nodeEnv !== 'production') {
        console.error(
          `Failed to send password reset email: ${errorText}. Reset link: ${resetUrl}`,
        );
        return;
      }
      throw new BadRequestException(
        `Failed to send password reset email: ${errorText}`,
      );
    }
  }
}
