import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import type { LocalizedText } from '../../categories/types/localized-text.interface';

@Schema({ _id: false })
export class ProductSpec {
  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  label: LocalizedText;

  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  value: LocalizedText;
}

export const ProductSpecSchema = new MongooseSchema(
  {
    label: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    value: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
  },
  { _id: false },
);

export type ProductSpecDocument = ProductSpec & Document;
