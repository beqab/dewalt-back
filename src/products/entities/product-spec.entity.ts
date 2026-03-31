import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import type { LocalizedText } from '../../categories/types/localized-text.interface';

@Schema({ _id: false })
export class ProductSpec {
  @Prop({
    type: {
      ka: { type: String, required: false, default: '' },
      en: { type: String, required: false, default: '' },
    },
    required: false,
  })
  label: LocalizedText;

  @Prop({
    type: {
      ka: { type: String, required: false, default: '' },
      en: { type: String, required: false, default: '' },
    },
    required: false,
  })
  value: LocalizedText;
}

export const ProductSpecSchema = new MongooseSchema(
  {
    label: {
      ka: { type: String, required: false, default: '' },
      en: { type: String, required: false, default: '' },
    },
    value: {
      ka: { type: String, required: false, default: '' },
      en: { type: String, required: false, default: '' },
    },
  },
  { _id: false },
);

export type ProductSpecDocument = ProductSpec & Document;
