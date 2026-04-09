import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandContentController } from './brand-content.controller';
import { BrandContentService } from './brand-content.service';
import {
  BrandContent,
  BrandContentSchema,
} from './entities/brand-content.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BrandContent.name, schema: BrandContentSchema },
    ]),
  ],
  controllers: [BrandContentController],
  providers: [BrandContentService],
  exports: [BrandContentService, MongooseModule],
})
export class BrandContentModule {}
