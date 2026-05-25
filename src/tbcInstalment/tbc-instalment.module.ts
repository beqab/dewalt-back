import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { EmailModule } from '../email/email.module';
import { TbcInstalmentController } from './tbc-instalment.controller';
import { TbcInstalmentService } from './tbc-instalment.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    OrdersModule,
    EmailModule,
  ],
  controllers: [TbcInstalmentController],
  providers: [TbcInstalmentService],
  exports: [TbcInstalmentService],
})
export class TbcInstalmentModule {}
