import { Prop, Schema } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
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
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  value: string | number;

  @Prop({ type: String, required: false })
  unit?: string;
}

export const ProductSpecSchema = new MongooseSchema(
  {
    label: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    value: { type: MongooseSchema.Types.Mixed, required: true },
    unit: { type: String, required: false },
  },
  { _id: false },
);
