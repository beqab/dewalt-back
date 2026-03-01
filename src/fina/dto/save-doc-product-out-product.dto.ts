import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class SaveDocProductOutProductDto {
  @ApiProperty({ description: 'Product id', example: 15 })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: 'Product sub-code id', example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sub_id: number;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 60 })
  @IsNumber()
  @Min(0)
  price: number;
}
