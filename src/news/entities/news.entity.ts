import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface LocalizedText {
  ka: string;
  en: string;
}

export interface News {
  imageUrl: string;
  title: LocalizedText;
  summary: LocalizedText;
  content: LocalizedText;
}

@Schema({ timestamps: true })
export class NewsArticle {
  @Prop({ type: String, required: true })
  imageUrl: string;

  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  title: LocalizedText;

  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  summary: LocalizedText;

  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  content: LocalizedText;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NewsArticleSchema = SchemaFactory.createForClass(NewsArticle);
export type NewsArticleDocument = NewsArticle & Document;
