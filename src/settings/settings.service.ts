import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private settingsModel: Model<SettingsDocument>,
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

    return doc;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsDocument> {
    const update = pickDefined(dto);

    // Avoid writing empty localized address object if nothing provided
    const addr = (update as unknown as { contactAddress?: unknown }).contactAddress;
    if (addr && typeof addr === 'object') {
      const a = addr as { ka?: unknown; en?: unknown };
      const normalized = {
        ka: typeof a.ka === 'string' ? a.ka : undefined,
        en: typeof a.en === 'string' ? a.en : undefined,
      };
      if (normalized.ka === undefined && normalized.en === undefined) {
        delete (update as unknown as { contactAddress?: unknown }).contactAddress;
      } else {
        (update as unknown as { contactAddress?: unknown }).contactAddress = {
          ...(normalized.ka !== undefined ? { ka: normalized.ka } : {}),
          ...(normalized.en !== undefined ? { en: normalized.en } : {}),
        };
      }
    }

    return this.settingsModel
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
  }
}
