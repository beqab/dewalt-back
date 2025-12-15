import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BannerSliderService } from './banner-slider.service';
import { BannerSliderController } from './banner-slider.controller';
import { BannerSlider, BannerSliderSchema } from './entities/banner.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BannerSlider.name, schema: BannerSliderSchema },
    ]),
    // JwtModule is now global, no need to import it here
  ],
  controllers: [BannerSliderController],
  providers: [BannerSliderService],
  exports: [BannerSliderService],
})
export class BannerSliderModule {}
