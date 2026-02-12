import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad, AdDocument } from './entities/ad.entity';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import { FRONT_ADS_TAGS } from '../revalidate/front-cache-tags';

@Injectable()
export class AdsService {
  constructor(
    @InjectModel(Ad.name)
    private adModel: Model<AdDocument>,
    private frontRevalidate: FrontRevalidateService,
  ) {}

  /**
   * Get all ads
   */
  async findAll(): Promise<AdDocument[]> {
    try {
      return await this.adModel.find().sort({ position: 1 }).exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch ads');
    }
  }

  /**
   * Get a single ad by ID
   */
  async findOne(id: string): Promise<AdDocument> {
    try {
      const ad = await this.adModel.findById(id).exec();

      if (!ad) {
        throw new NotFoundException(`Ad with ID ${id} not found`);
      }

      return ad;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch ad');
    }
  }

  /**
   * Get ad by position
   */
  async findByPosition(position: string): Promise<AdDocument | null> {
    console.log('findByPosition', position);
    try {
      const result = await this.adModel.findOne({ position }).exec();
      console.log('result', result);
      return result;
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Failed to fetch ad by position');
    }
  }

  /**
   * Create a new ad
   */
  async create(createAdDto: CreateAdDto): Promise<AdDocument> {
    try {
      // Check if ad with this position already exists
      const existingAd = await this.adModel
        .findOne({ position: createAdDto.position })
        .exec();

      if (existingAd) {
        throw new ConflictException(
          `Ad with position ${createAdDto.position} already exists`,
        );
      }

      const ad = await this.adModel.create(createAdDto);
      void this.frontRevalidate.revalidateTags(FRONT_ADS_TAGS);
      return ad;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create ad');
    }
  }

  /**
   * Update an ad by ID
   */
  async update(id: string, updateAdDto: UpdateAdDto): Promise<AdDocument> {
    try {
      // If position is being updated, check for conflicts
      if (updateAdDto.position) {
        const existingAd = await this.adModel
          .findOne({ position: updateAdDto.position, _id: { $ne: id } })
          .exec();

        if (existingAd) {
          throw new ConflictException(
            `Ad with position ${updateAdDto.position} already exists`,
          );
        }
      }

      const ad = await this.adModel
        .findByIdAndUpdate(id, updateAdDto, { new: true })
        .exec();

      if (!ad) {
        throw new NotFoundException(`Ad with ID ${id} not found`);
      }

      void this.frontRevalidate.revalidateTags(FRONT_ADS_TAGS);
      return ad;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update ad');
    }
  }

  /**
   * Delete an ad by ID
   */
  async remove(id: string): Promise<void> {
    try {
      const result = await this.adModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new NotFoundException(`Ad with ID ${id} not found`);
      }

      void this.frontRevalidate.revalidateTags(FRONT_ADS_TAGS);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete ad');
    }
  }
}
