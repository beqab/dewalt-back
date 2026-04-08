import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

type LocalizedText = { ka: string; en: string };

@Schema({ timestamps: true })
export class Terms {
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
  content?: LocalizedText;
}

export const TermsSchema = SchemaFactory.createForClass(Terms);
export type TermsDocument = Terms & Document;
