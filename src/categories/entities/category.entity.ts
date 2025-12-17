import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Brand } from './brand.entity';
import type { LocalizedText } from '../types/localized-text.interface';

@Schema({ timestamps: true })
export class Category {
  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  name: LocalizedText;

  @Prop({ type: String, required: true, unique: false })
  slug: string; // URL-friendly identifier (can be duplicate across brands)

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  })
  brandId: MongooseSchema.Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
export type CategoryDocument = Category & Document;
