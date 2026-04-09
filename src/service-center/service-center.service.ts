import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FRONT_SERVICE_CENTER_TAGS } from '../revalidate/front-cache-tags';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import { UpdateServiceCenterDto } from './dto/update-service-center.dto';
import {
  ServiceCenter,
  ServiceCenterDocument,
} from './entities/service-center.entity';

function pickDefined<T extends object>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    ),
  ) as Partial<Record<keyof T, unknown>>;
}

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

@Injectable()
export class ServiceCenterService {
  constructor(
    @InjectModel(ServiceCenter.name)
    private serviceCenterModel: Model<ServiceCenterDocument>,
    private frontRevalidate: FrontRevalidateService,
  ) {}

  async getServiceCenter(): Promise<ServiceCenterDocument> {
    return this.serviceCenterModel
      .findOneAndUpdate(
        { key: 'main' },
        { $setOnInsert: { key: 'main' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async updateServiceCenter(
    dto: UpdateServiceCenterDto,
  ): Promise<ServiceCenterDocument> {
    const update = pickDefined(dto);

    const localizedFields = ['heroTitle', 'content'] as const;
    for (const field of localizedFields) {
      const normalized = normalizeLocalizedText(
        (update as Record<string, unknown>)[field],
      );
      if (normalized === undefined) {
        delete (update as Record<string, unknown>)[field];
      } else {
        (update as Record<string, unknown>)[field] = normalized;
      }
    }

    const doc = await this.serviceCenterModel
      .findOneAndUpdate(
        { key: 'main' },
        {
          $setOnInsert: { key: 'main' },
          $set: update,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    void this.frontRevalidate.revalidateTags(
      FRONT_SERVICE_CENTER_TAGS as string[],
    );

    return doc;
  }
}
