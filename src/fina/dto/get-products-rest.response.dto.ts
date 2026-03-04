import { ApiProperty } from '@nestjs/swagger';

export class FinaProductRestItemDto {
  @ApiProperty({ description: 'FINA product id', example: 2 })
  id: number;

  @ApiProperty({ description: 'Store id', example: 1 })
  store: number;

  @ApiProperty({ description: 'Remaining quantity in the store', example: 399 })
  rest: number;

  @ApiProperty({ description: 'Reserved quantity in the store', example: 0 })
  reserve: number;
}

export class GetProductsRestResponseDto {
  @ApiProperty({
    description: 'Per-store product rest entries',
    type: [FinaProductRestItemDto],
  })
  rest: FinaProductRestItemDto[];

  @ApiProperty({ required: false, nullable: true })
  ex?: string | null;
}
