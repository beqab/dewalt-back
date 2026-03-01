import { ApiProperty } from '@nestjs/swagger';
import { FinaUserDto } from './fina-user.dto';

export class GetUsersResponseDto {
  @ApiProperty({ type: [FinaUserDto] })
  users: FinaUserDto[];

  @ApiProperty({
    description: 'Error info (if any)',
    example: null,
    required: false,
    nullable: true,
  })
  ex?: string | null;
}
