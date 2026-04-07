import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FRONT_SETTINGS_TAGS } from '../revalidate/front-cache-tags';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import { Settings, SettingsDocument } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

function pickDefined<T extends object>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    ),
  ) as Partial<Record<keyof T, unknown>>;
}

function isLegacyAddress(value: unknown): value is string {
  return typeof value === 'string';
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
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private settingsModel: Model<SettingsDocument>,
    private frontRevalidate: FrontRevalidateService,
  ) {}

  async getSettings(): Promise<SettingsDocument> {
    const doc = await this.settingsModel
      .findOneAndUpdate(
        { key: 'main' },
        // Let Mongoose schema defaults populate delivery fields on insert.
        { $setOnInsert: { key: 'main' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    // Backward compatibility: old docs may have contactAddress as string.
    const legacyAddress = (doc as unknown as { contactAddress?: unknown })
      .contactAddress;
    if (isLegacyAddress(legacyAddress) && legacyAddress.trim()) {
      await this.settingsModel
        .updateOne(
          { _id: doc._id },
          { $set: { contactAddress: { ka: legacyAddress, en: '' } } },
        )
        .exec();
      (doc as unknown as { contactAddress?: unknown }).contactAddress = {
        ka: legacyAddress,
        en: '',
      };
    }

    // Backward compatibility: ensure boolean toggles exist on older docs.
    const freeDeliveryEnabled = (
      doc as unknown as { freeDeliveryEnabled?: unknown }
    ).freeDeliveryEnabled;
    if (typeof freeDeliveryEnabled !== 'boolean') {
      await this.settingsModel
        .updateOne({ _id: doc._id }, { $set: { freeDeliveryEnabled: true } })
        .exec();
      (
        doc as unknown as { freeDeliveryEnabled?: unknown }
      ).freeDeliveryEnabled = true;
    }

    return doc;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsDocument> {
    const update = pickDefined(dto);

    const localizedFields = [
      'contactAddress',
      'aboutTitle',
      'aboutSubtitle',
      'aboutContent',
    ] as const;

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

    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: 'main' },
        {
          // IMPORTANT: avoid setting same field in $setOnInsert and $set
          // (Mongo throws ConflictingUpdateOperators).
          $setOnInsert: { key: 'main' },
          $set: update,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    void this.frontRevalidate.revalidateTags(FRONT_SETTINGS_TAGS as string[]);

    return settings;
  }
}
