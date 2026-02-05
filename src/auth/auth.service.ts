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
import { TranslationHelperService } from '../translation/translationHelper.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private translationHelper: TranslationHelperService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const tAuth = this.translationHelper.withNamespace('auth');
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        email: registerDto.email.toLowerCase(),
      });

      if (existingUser) {
        throw new BadRequestException(tAuth('userExists'));
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
        throw new BadRequestException(tAuth('createUserFailed'));
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
      throw new BadRequestException(tAuth('registrationFailed'));
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const tAuth = this.translationHelper.withNamespace('auth');
    try {
      // Find user with email
      const user = await this.userModel.findOne({
        email: loginDto.email.toLowerCase(),
      });

      if (!user) {
        throw new BadRequestException(tAuth('invalidCredentials'));
      }

      if (!user.isActive) {
        throw new UnauthorizedException(tAuth('accountDeactivated'));
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException(tAuth('emailNotVerified'));
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!passwordMatch) {
        throw new BadRequestException(tAuth('invalidCredentials'));
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
      throw new BadRequestException(tAuth('loginFailed'));
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tAuth = this.translationHelper.withNamespace('auth');
    if (!token) {
      throw new BadRequestException(tAuth('verifyTokenRequired'));
    }

    const user = await this.userModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException(tAuth('verifyTokenInvalid'));
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return { message: tAuth('emailVerified') };
  }

  private async sendVerificationEmail(email: string, token: string) {
    const tAuth = this.translationHelper.withNamespace('auth');
    const resendKey = this.configService.get<string>('RESEND_EMAIL_KEY');
    if (!resendKey) {
      throw new BadRequestException(tAuth('resendKeyMissing'));
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const frontUrl = this.configService.get<string>('FRONT_URL') || '';
    const normalizedFrontUrl = frontUrl.endsWith('/')
      ? frontUrl
      : `${frontUrl}/`;
    let locale = 'ka';
    try {
      locale = this.translationHelper.currentLanguage;
    } catch {
      locale = 'ka';
    }
    const verifyUrl = `${normalizedFrontUrl}${locale}/verify-email?token=${token}`;
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
        subject: tAuth('verifyEmailSubject'),
        html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial, sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#f9c300;padding:20px 32px;">
                <h1 style="margin:0;font-size:20px;color:#1f1f1f;letter-spacing:0.5px;">DEWALT</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 12px 0;font-size:20px;color:#1f1f1f;">${tAuth(
                  'verifyEmailTitle',
                )}</h2>
                <p style="margin:0 0 16px 0;color:#4b4b4b;font-size:14px;line-height:1.6;">
                  ${tAuth('verifyEmailIntro')}
                </p>
                <p style="margin:0 0 24px 0;color:#4b4b4b;font-size:14px;line-height:1.6;">
                  ${tAuth('verifyEmailCta')}
                </p>
                <a href="${verifyUrl}" style="display:inline-block;background-color:#f9c300;color:#1f1f1f;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:6px;font-size:14px;">
                  ${tAuth('verifyEmailButton')}
                </a>
                <p style="margin:24px 0 0 0;color:#7a7a7a;font-size:12px;line-height:1.6;">
                  ${verifyUrl}
                </p>
                ${
                  recipientEmail !== email
                    ? `<p style="margin:16px 0 0 0;color:#7a7a7a;font-size:12px;line-height:1.6;">${tAuth(
                        'emailIntendedRecipient',
                        { email },
                      )}</p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #eee;color:#8a8a8a;font-size:12px;">
                ${tAuth('emailFooter')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
        `,
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
      throw new BadRequestException(tAuth('verificationEmailSendFailed'));
    }
  }

  async requestPasswordReset(
    requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    const tUser = this.translationHelper.withNamespace('userService');
    try {
      const user = await this.userModel.findOne({
        email: requestPasswordResetDto.email.toLowerCase(),
      });

      if (!user) {
        // Don't reveal if user exists for security
        return {
          message: tUser('PasswordResetEmailSent'),
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
        message: tUser('PasswordResetEmailSent'),
      };
    } catch (error) {
      throw new BadRequestException(tUser('PasswordResetRequestFailed'));
    }
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const tAuth = this.translationHelper.withNamespace('auth');
    try {
      // Find user by reset token
      const user = await this.userModel.findOne({
        passwordResetToken: resetPasswordDto.token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new BadRequestException(tAuth('resetTokenInvalid'));
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
        message: tAuth('passwordResetSuccess'),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(tAuth('passwordResetFailed'));
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const tAuth = this.translationHelper.withNamespace('auth');
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new NotFoundException(tAuth('userNotFound'));
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!passwordMatch) {
        throw new BadRequestException(tAuth('currentPasswordIncorrect'));
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
        message: tAuth('passwordChangeSuccess'),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(tAuth('passwordChangeFailed'));
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ token: string; tokenExpiresAt: Date }> {
    const tAuth = this.translationHelper.withNamespace('auth');
    try {
      const secret = this.configService.get<string>('USER_REFRESH_SECRET');
      const payload = this.jwtService.verify<{ userId: string; email: string }>(
        refreshToken,
        { secret },
      );

      // Find user and verify refresh token exists
      const user = await this.userModel.findById(payload.userId);

      if (!user || !user.refreshTokens.includes(refreshToken)) {
        throw new UnauthorizedException(tAuth('invalidRefreshToken'));
      }

      if (!user.isActive) {
        throw new UnauthorizedException(tAuth('accountDeactivated'));
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
      throw new UnauthorizedException(tAuth('refreshTokenInvalid'));
    }
  }

  async logout(
    userId: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    const tAuth = this.translationHelper.withNamespace('auth');
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken },
      });

      return {
        message: tAuth('logoutSuccess'),
      };
    } catch (error) {
      throw new BadRequestException(tAuth('logoutFailed'));
    }
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const tAuth = this.translationHelper.withNamespace('auth');
    try {
      const user = await this.userModel
        .findById(userId)
        .select(
          '-password -refreshTokens -passwordResetToken -passwordResetExpires',
        )
        .lean();

      if (!user) {
        throw new NotFoundException(tAuth('userNotFound'));
      }

      return user as unknown as UserResponseDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(tAuth('getUserFailed'));
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
    const tUser = this.translationHelper.withNamespace('userService');
    const resendKey = this.configService.get<string>('RESEND_EMAIL_KEY');
    if (!resendKey) {
      throw new BadRequestException('RESEND_EMAIL_KEY is not configured');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const frontUrl = this.configService.get<string>('FRONT_URL') || '';
    const normalizedFrontUrl = frontUrl.endsWith('/')
      ? frontUrl
      : `${frontUrl}/`;
    let locale = 'ka';
    try {
      locale = this.translationHelper.currentLanguage;
    } catch {
      locale = 'ka';
    }
    const resetUrl = `${normalizedFrontUrl}${locale}/reset-password?token=${token}`;
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
        subject: tUser('PasswordResetEmailSubject'),
        html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial, sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#f9c300;padding:20px 32px;">
                <h1 style="margin:0;font-size:20px;color:#1f1f1f;letter-spacing:0.5px;">DEWALT</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 12px 0;font-size:20px;color:#1f1f1f;">${tUser(
                  'PasswordResetEmailSubject',
                )}</h2>
                <p style="margin:0 0 16px 0;color:#4b4b4b;font-size:14px;line-height:1.6;">
                  ${tUser('PasswordResetEmailIntro')}
                </p>
                <p style="margin:0 0 24px 0;color:#4b4b4b;font-size:14px;line-height:1.6;">
                  ${tUser('PasswordResetEmailCta')}
                </p>
                <a href="${resetUrl}" style="display:inline-block;background-color:#f9c300;color:#1f1f1f;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:6px;font-size:14px;">
                  ${tUser('PasswordResetEmailSubject')}
                </a>
                <p style="margin:24px 0 0 0;color:#7a7a7a;font-size:12px;line-height:1.6;">
                  ${resetUrl}
                </p>
                ${
                  recipientEmail !== email
                    ? `<p style="margin:16px 0 0 0;color:#7a7a7a;font-size:12px;line-height:1.6;">${tUser(
                        'PasswordResetEmailIntendedRecipient',
                        { email },
                      )}</p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #eee;color:#8a8a8a;font-size:12px;">
                ${tUser('PasswordResetEmailFooter')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
        `,
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
