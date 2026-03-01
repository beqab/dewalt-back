import { ApiProperty } from '@nestjs/swagger';
import { PriceTypeDto } from './price-type.dto';

export class GetPriceTypesResponseDto {
  @ApiProperty({ type: [PriceTypeDto] })
  types: PriceTypeDto[];

  @ApiProperty({
    description: 'Error info (if any)',
    example: null,
    required: false,
    nullable: true,
  })
  ex?: string | null;
}
