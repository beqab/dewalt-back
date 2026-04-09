import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FRONT_BRAND_CONTENT_TAGS } from '../revalidate/front-cache-tags';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import { UpdateBrandContentDto } from './dto/update-brand-content.dto';
import {
  BrandContent,
  BrandContentDocument,
} from './entities/brand-content.entity';

function normalizeLocalizedText(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;

  const localized = value as { ka?: unknown; en?: unknown };
  const normalized = {
    ka: typeof localized.ka === 'string' ? localized.ka : undefined,
    en: typeof localized.en === 'string' ? localized.en : undefined,
  };

  if (normalized.ka === undefined && normalized.en === undefined) {
    return undefined;
  }

  return {
    ka: normalized.ka ?? '',
    en: normalized.en ?? '',
  };
}

type BrandKey = 'dewalt' | 'stanley' | 'blackDecker';

function normalizeBrandBlock(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;

  const block = value as Record<string, unknown>;
  const normalized = {
    cardDescription: normalizeLocalizedText(block.cardDescription),
    aboutContent: normalizeLocalizedText(block.aboutContent),
  };

  if (!normalized.cardDescription && !normalized.aboutContent) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([, fieldValue]) => fieldValue !== undefined),
  );
}

@Injectable()
export class BrandContentService {
  constructor(
    @InjectModel(BrandContent.name)
    private brandContentModel: Model<BrandContentDocument>,
    private frontRevalidate: FrontRevalidateService,
  ) {}

  async getBrandContent(): Promise<BrandContentDocument> {
    return this.brandContentModel
      .findOneAndUpdate(
        { key: 'main' },
        { $setOnInsert: { key: 'main' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async updateBrandContent(
    dto: UpdateBrandContentDto,
  ): Promise<BrandContentDocument> {
    const update: Record<string, unknown> = {};
    const brandKeys: BrandKey[] = ['dewalt', 'stanley', 'blackDecker'];

    for (const brandKey of brandKeys) {
      const normalized = normalizeBrandBlock(
        dto[brandKey as keyof UpdateBrandContentDto],
      );

      if (!normalized) continue;

      for (const [field, value] of Object.entries(normalized)) {
        update[`${brandKey}.${field}`] = value;
      }
    }

    const brandContent = await this.brandContentModel
      .findOneAndUpdate(
        { key: 'main' },
        {
          $setOnInsert: { key: 'main' },
          ...(Object.keys(update).length > 0 ? { $set: update } : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    void this.frontRevalidate.revalidateTags(
      FRONT_BRAND_CONTENT_TAGS as string[],
    );

    return brandContent;
  }
}
