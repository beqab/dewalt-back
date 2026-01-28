import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType } from '../entities/order.entity';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '66b9d248a3142c7c3e2d4c11',
  })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  surname: string;

  @ApiProperty({ example: '01017012345' })
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'Personal ID must be 11 digits' })
  personalId: string;

  @ApiProperty({ example: '+995577955582' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Tbilisi, Ksani st. 36' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ enum: DeliveryType, example: DeliveryType.Tbilisi })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({
    required: false,
    description: 'User ID (optional)',
    example: '66b9d248a3142c7c3e2d4c11',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;
}
