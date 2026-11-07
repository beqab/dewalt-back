import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/**
 * Cancels Pending orders whose stock reservation has expired and returns the
 * reserved stock, every 5 minutes. Replaces the external cron-job.org trigger.
 * Enabled only when RESERVATION_RELEASE_CRON=true, so local dev does not run it.
 */
@Injectable()
export class ReservationReleaseCron {
  private readonly logger = new Logger(ReservationReleaseCron.name);
  private running = false;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 */5 * * * *', { name: 'release-expired-reservations' })
  async handle(): Promise<void> {
    if (this.configService.get<string>('RESERVATION_RELEASE_CRON') !== 'true') {
      return;
    }
    // Skip if the previous run is still in progress.
    if (this.running) return;

    this.running = true;
    try {
      const result = await this.ordersService.releaseExpiredReservations();
      if (result.released > 0) {
        this.logger.log(
          `Released ${result.released}/${result.scanned} expired reservations`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Releasing expired reservations failed',
        error as Error,
      );
    } finally {
      this.running = false;
    }
  }
}
