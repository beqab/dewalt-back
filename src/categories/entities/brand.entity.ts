import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { LocalizedText } from '../types/localized-text.interface';

@Schema({ timestamps: true })
export class Brand {
  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  name: LocalizedText;

  @Prop({ type: String, unique: true, required: true })
  slug: string; // URL-friendly identifier (e.g., "dewalt", "stanley", "black-decker")

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
export type BrandDocument = Brand & Document;
