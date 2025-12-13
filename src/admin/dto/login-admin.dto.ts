import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginAdminDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Admin username',
    example: 'admin_user',
  })
  username: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Admin password',
    example: 'password123',
  })
  password: string;
}
