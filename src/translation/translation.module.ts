import { Module } from '@nestjs/common';
import { TranslationHelperService } from './translationHelper.service';

@Module({
  providers: [TranslationHelperService],
  exports: [TranslationHelperService],
})
export class TranslationModule {}
