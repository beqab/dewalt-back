import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaveDocProductOutProductDto } from './save-doc-product-out-product.dto';

export class SaveDocProductOutDto {
  @ApiProperty({
    description: 'Operation id (0 for insert)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  id: number;

  @ApiProperty({
    description: 'Operation datetime (ISO 8601)',
    example: '2026-02-19T15:00:00',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Purpose/comment', example: 'ონლაინ გაყიდვა' })
  @IsOptional()
  @IsString()
  purpose: string;

  @ApiProperty({ description: 'Total amount', example: 120.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'GEL',
    default: 'GEL',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({ description: 'Currency rate', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  rate: number;

  @ApiProperty({ description: 'Store id', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  store: number;

  @ApiProperty({ description: 'User id (creator)', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  user: number;

  @ApiProperty({ description: 'Customer id (0 allowed)', example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  customer: number;

  @ApiProperty({ description: 'Includes VAT', example: true })
  @IsBoolean()
  is_vat: boolean;

  @ApiProperty({ description: 'VAT value/rate', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vat: number;

  @ApiProperty({ description: 'Make accounting entry', example: true })
  @IsBoolean()
  make_entry: boolean;

  @ApiProperty({
    description:
      'Pay type (0 cash, 1 non-cash, 2 consignment, 3 installment, ...)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  pay_type: number;

  @ApiProperty({ description: 'Price type id', example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price_type: number;

  @ApiProperty({ description: 'Waybill type', example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  w_type: number;

  @ApiProperty({ description: 'Transport type', example: 7, default: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  t_type: number;

  @ApiProperty({ description: 'Transport payer', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  t_payer: number;

  @ApiProperty({ type: [SaveDocProductOutProductDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveDocProductOutProductDto)
  products: SaveDocProductOutProductDto[];
}
