import { Module } from '@nestjs/common';
import { FinaController } from './fina.controller';
import { FinaService } from './fina.service';

@Module({
  controllers: [FinaController],
  providers: [FinaService],
  exports: [FinaService],
})
export class FinaModule {}

