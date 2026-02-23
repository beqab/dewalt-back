import { ApiProperty } from '@nestjs/swagger';

export class FinaUserDto {
  @ApiProperty({ description: 'User id', example: 1 })
  id: number;

  @ApiProperty({ description: 'User full name', example: 'ადმინისტრატორი' })
  name: string;

  @ApiProperty({
    description: 'User type (1 admin, 2 operator, 3 cashier operator)',
    example: 1,
  })
  type: number;
}

