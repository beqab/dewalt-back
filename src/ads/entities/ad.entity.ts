import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AdPosition {
  MAIN_PAGE = 'main_page',
  ASIDE = 'aside',
  FOOTER = 'footer',
}

@Schema({ timestamps: true })
export class Ad {
  @Prop({ type: String, required: true })
  imageUrl: string;

  @Prop({ type: String, required: false })
  urlLink?: string;

  @Prop({
    type: String,
    enum: AdPosition,
    required: true,
    unique: true,
  })
  position: AdPosition;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AdSchema = SchemaFactory.createForClass(Ad);
export type AdDocument = Ad & Document;
