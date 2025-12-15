import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BannerSlider,
  BannerSliderDocument,
  Banner,
} from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannerSliderService {
  constructor(
    @InjectModel(BannerSlider.name)
    private bannerSliderModel: Model<BannerSliderDocument>,
  ) {}

  private async getOrCreateBannerSlider(): Promise<BannerSliderDocument> {
    try {
      let bannerSlider = await this.bannerSliderModel.findOne().exec();

      if (!bannerSlider) {
        bannerSlider = await this.bannerSliderModel.create({
          banners: [],
        });
      }

      return bannerSlider;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   * Get all banners
   */
  async findAll(): Promise<BannerSliderDocument> {
    try {
      const bannerSlider = await this.getOrCreateBannerSlider();
      return bannerSlider;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   * Add a new banner
   */
  async create(
    createBannerDto: CreateBannerDto,
  ): Promise<BannerSliderDocument> {
    try {
      const bannerSlider = await this.getOrCreateBannerSlider();

      // Add new banner to the end of array (order = array length)
      const newBanner = {
        ...createBannerDto,
        order: bannerSlider.banners.length,
      };
      bannerSlider.banners.push(newBanner as Banner);

      await bannerSlider.save();
      return bannerSlider;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   * Update a banner by order
   */
  async update(
    bannerOrder: string,
    updateBannerDto: UpdateBannerDto,
  ): Promise<BannerSliderDocument> {
    try {
      const bannerSlider = await this.getOrCreateBannerSlider();

      const order = parseInt(bannerOrder);
      if (isNaN(order)) {
        throw new BadRequestException(`Invalid banner order: ${bannerOrder}`);
      }

      // Find banner by order
      const bannerIndex = bannerSlider.banners.findIndex(
        (b) => b.order === order,
      );

      if (bannerIndex === -1) {
        throw new NotFoundException(`Banner with order ${order} not found`);
      }

      // Update banner properties (order is managed by array position, not updated here)
      Object.assign(bannerSlider.banners[bannerIndex], updateBannerDto);

      await bannerSlider.save();
      return bannerSlider;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   * Delete a banner by order
   */
  async remove(bannerOrder: string): Promise<BannerSliderDocument> {
    try {
      const bannerSlider = await this.getOrCreateBannerSlider();

      const order = parseInt(bannerOrder);
      if (isNaN(order)) {
        throw new BadRequestException(`Invalid banner order: ${bannerOrder}`);
      }

      const initialLength = bannerSlider.banners.length;
      bannerSlider.banners = bannerSlider.banners.filter(
        (banner) => banner.order !== order,
      );

      if (bannerSlider.banners.length === initialLength) {
        throw new NotFoundException(`Banner with order ${order} not found`);
      }

      await bannerSlider.save();
      return bannerSlider;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   * Reorder banners by replacing entire array
   * Order is determined by array position
   */
  async reorder(banners: CreateBannerDto[]): Promise<BannerSliderDocument> {
    try {
      const bannerSlider = await this.getOrCreateBannerSlider();

      // Map banners with order based on array index
      const reorderedBanners = banners.map((banner, index) => ({
        ...banner,
        order: index,
      }));

      // Replace entire banners array
      bannerSlider.banners = reorderedBanners as Banner[];

      await bannerSlider.save();
      return bannerSlider;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
