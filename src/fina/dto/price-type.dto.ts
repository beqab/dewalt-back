import { ApiProperty } from '@nestjs/swagger';

export class PriceTypeDto {
  @ApiProperty({ description: 'Price type id', example: 3 })
  id: number;

  @ApiProperty({ description: 'Price type name', example: 'საცალო' })
  name: string;
}

