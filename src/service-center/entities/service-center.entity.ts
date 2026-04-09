import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

type LocalizedText = { ka: string; en: string };

@Schema({ timestamps: true })
export class ServiceCenter {
  @Prop({ type: String, required: true, unique: true, default: 'main' })
  key: 'main';

  @Prop({
    type: {
      ka: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    required: false,
    default: { ka: '', en: '' },
  })
  heroTitle?: LocalizedText;

  @Prop({
    type: {
      ka: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    required: false,
    default: { ka: '', en: '' },
  })
  content?: LocalizedText;

  @Prop({ type: String, required: false, default: '' })
  imageUrl?: string;
}

export const ServiceCenterSchema = SchemaFactory.createForClass(ServiceCenter);
export type ServiceCenterDocument = ServiceCenter & Document;
