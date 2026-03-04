import { ApiProperty } from '@nestjs/swagger';

export class SyncFinaQuantitiesResponseDto {
  @ApiProperty({ description: 'How many local products had a finaId' })
  localProductsWithFinaId: number;

  @ApiProperty({
    description: 'How many unique finaIds were requested from FINA',
  })
  requestedFinaIds: number;

  @ApiProperty({
    description: 'How many (finaId -> quantity) pairs were parsed from FINA',
  })
  finaRestItemsParsed: number;

  @ApiProperty({
    description: 'How many local products had a matching fina rest item',
  })
  matchedLocalProducts: number;

  @ApiProperty({
    description: 'How many local products were updated (quantity only)',
  })
  updatedProducts: number;

  @ApiProperty({
    description:
      'How many local products were skipped due to missing fina rest',
  })
  skippedNoRest: number;
}
