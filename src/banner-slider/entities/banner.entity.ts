import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface LocalizedText {
  ka: string;
  en: string;
}

export interface Banner {
  imageUrl: string;
  title: LocalizedText;
  description: LocalizedText;
  order: number;
  buttonLink?: string;
}

@Schema({ timestamps: true })
export class BannerSlider {
  @Prop({
    type: [
      {
        imageUrl: { type: String, required: true },
        title: {
          ka: { type: String, required: false },
          en: { type: String, required: false },
        },
        description: {
          ka: { type: String, required: false },
          en: { type: String, required: false },
        },
        order: { type: Number, required: true },
        buttonLink: { type: String, required: false },
      },
    ],
    default: [],
  })
  banners: Banner[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BannerSliderSchema = SchemaFactory.createForClass(BannerSlider);
export type BannerSliderDocument = BannerSlider & Document;
