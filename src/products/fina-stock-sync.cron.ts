import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { ProductsService } from './products.service';

/**
 * Syncs Product.quantity from FINA every 15 minutes.
 * Enabled only when FINA_STOCK_SYNC_CRON=true, so local dev does not run it.
 */
@Injectable()
export class FinaStockSyncCron {
  private readonly logger = new Logger(FinaStockSyncCron.name);
  private running = false;

  constructor(
    private readonly productsService: ProductsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 */15 * * * *', { name: 'fina-stock-sync' })
  async handle(): Promise<void> {
    if (this.configService.get<string>('FINA_STOCK_SYNC_CRON') !== 'true') {
      return;
    }
    // Skip if the previous run is still in progress.
    if (this.running) return;

    this.running = true;
    try {
      const result = await this.productsService.syncQuantitiesFromFina();
      this.logger.log(
        `FINA stock sync: updated ${result.updatedProducts}/${result.matchedLocalProducts}`,
      );
    } catch (error) {
      this.logger.error('FINA stock sync failed', error as Error);
    } finally {
      this.running = false;
    }
  }
}
