import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceCenterController } from './service-center.controller';
import { ServiceCenterService } from './service-center.service';
import {
  ServiceCenter,
  ServiceCenterSchema,
} from './entities/service-center.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceCenter.name, schema: ServiceCenterSchema },
    ]),
  ],
  controllers: [ServiceCenterController],
  providers: [ServiceCenterService],
  exports: [ServiceCenterService, MongooseModule],
})
export class ServiceCenterModule {}
