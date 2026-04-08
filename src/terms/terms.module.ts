import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { Terms, TermsSchema } from './entities/terms.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Terms.name, schema: TermsSchema }]),
  ],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService, MongooseModule],
})
export class TermsModule {}
