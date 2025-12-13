import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Admin username',
    example: 'admin_user',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Admin password (minimum 6 characters)',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
