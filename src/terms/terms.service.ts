import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FRONT_TERMS_TAGS } from '../revalidate/front-cache-tags';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import { UpdateTermsDto } from './dto/update-terms.dto';
import { Terms, TermsDocument } from './entities/terms.entity';

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
export class TermsService {
  constructor(
    @InjectModel(Terms.name)
    private termsModel: Model<TermsDocument>,
    private frontRevalidate: FrontRevalidateService,
  ) {}

  async getTerms(): Promise<TermsDocument> {
    return this.termsModel
      .findOneAndUpdate(
        { key: 'main' },
        { $setOnInsert: { key: 'main' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async updateTerms(dto: UpdateTermsDto): Promise<TermsDocument> {
    const update = pickDefined(dto);
    const normalized = normalizeLocalizedText(update.content);

    if (normalized === undefined) {
      delete update.content;
    } else {
      update.content = normalized;
    }

    const terms = await this.termsModel
      .findOneAndUpdate(
        { key: 'main' },
        {
          $setOnInsert: { key: 'main' },
          $set: update,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    void this.frontRevalidate.revalidateTags(FRONT_TERMS_TAGS as string[]);

    return terms;
  }
}
