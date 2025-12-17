import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Category } from './category.entity';
import type { LocalizedText } from '../types/localized-text.interface';

@Schema({ timestamps: true })
export class ChildCategory {
  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  name: LocalizedText;

  @Prop({ type: String, required: true })
  slug: string; // URL-friendly identifier

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId: MongooseSchema.Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ChildCategorySchema = SchemaFactory.createForClass(ChildCategory);
export type ChildCategoryDocument = ChildCategory & Document;
