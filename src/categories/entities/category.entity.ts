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

  @Prop({ type: String, required: true, unique: true })
  slug: string; // URL-friendly identifier (unique globally)

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Brand' }],
    default: [],
  })
  brandIds: MongooseSchema.Types.ObjectId[]; // Many-to-many relationship with brands

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
export type CategoryDocument = Category & Document;
