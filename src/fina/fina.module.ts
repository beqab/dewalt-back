import { Module } from '@nestjs/common';
import { FinaController } from './fina.controller';
import { FinaService } from './fina.service';
import { FinaOperationController } from './fina-operation.controller';

@Module({
  controllers: [FinaController, FinaOperationController],
  providers: [FinaService],
  exports: [FinaService],
})
export class FinaModule {}
