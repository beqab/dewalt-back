import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: '66b9d248a3142c7c3e2d4c11' })
  @IsMongoId()
  orderId: string;
}
