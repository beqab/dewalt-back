import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaymentOption } from '../entities/order.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: '66b9d248a3142c7c3e2d4c11' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({
    enum: PaymentOption,
    required: false,
    default: PaymentOption.Card,
    description:
      'card = regular Flitt merchant, distribution = TBC განაწილება Flitt merchant',
  })
  @IsOptional()
  @IsEnum(PaymentOption)
  paymentType?: PaymentOption;
}
