import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
    required: false,
  })
  email?: string;
}
