import { ApiProperty } from '@nestjs/swagger';

export class FinaProductListItemDto {
  @ApiProperty({ description: 'FINA product id', example: 12345 })
  id: number;

  @ApiProperty({
    description: 'FINA product code (if available)',
    example: 'FINA-ABC-001',
    required: false,
  })
  code?: string;

  @ApiProperty({
    description: 'FINA product name (if available)',
    example: 'Angle Grinder 720W',
    required: false,
  })
  name?: string;
}
