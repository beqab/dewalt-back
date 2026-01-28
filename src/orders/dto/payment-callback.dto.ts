import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentCallbackDto {
  @ApiProperty({ example: '66b9d248a3142c7c3e2d4c11' })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({ example: 'approved' })
  @IsString()
  @IsNotEmpty()
  order_status: string;

  @ApiProperty({ example: 120 })
  @IsString()
  @IsNotEmpty()
  amount: string;
}
