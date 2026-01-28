import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @ApiProperty({ example: '66b9d248a3142c7c3e2d4c11' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.Paid })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
