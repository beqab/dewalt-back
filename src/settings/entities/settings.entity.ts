import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

type LocalizedText = { ka: string; en: string };

@Schema({ timestamps: true })
export class Settings {
  @Prop({ type: String, required: true, unique: true, default: 'main' })
  key: 'main';

  // Contact info
  @Prop({ type: String, required: false })
  contactPhone?: string;

  @Prop({ type: String, required: false })
  contactPhone2?: string;

  @Prop({ type: String, required: false })
  contactEmail?: string;

  @Prop({ type: String, required: false })
  contactFacebook?: string;

  @Prop({
    type: {
      ka: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    required: false,
    default: { ka: '', en: '' },
  })
  contactAddress?: LocalizedText;

  // Delivery rules
  @Prop({ type: Number, required: true, default: 10 })
  deliveryTbilisiPrice: number;

  @Prop({ type: Number, required: true, default: 150 })
  deliveryTbilisiFreeOver: number;

  @Prop({ type: Number, required: true, default: 15 })
  deliveryRegionPrice: number;

  @Prop({ type: Number, required: true, default: 300 })
  deliveryRegionFreeOver: number;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
export type SettingsDocument = Settings & Document;
