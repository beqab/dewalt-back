import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name?: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email?: string;
}
