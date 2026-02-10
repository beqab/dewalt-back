import { Global, Module } from '@nestjs/common';
import { FrontRevalidateService } from './front-revalidate.service';

@Global()
@Module({
  providers: [FrontRevalidateService],
  exports: [FrontRevalidateService],
})
export class RevalidateModule {}
