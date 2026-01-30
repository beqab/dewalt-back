import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  surname: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: [] })
  refreshTokens: string[];

  @Prop({ type: String, default: null, required: false })
  passwordResetToken: string | null;

  @Prop({ type: Date, default: null, required: false })
  passwordResetExpires: Date | null;

  @Prop({ type: Boolean, default: false })
  emailVerified: boolean;

  @Prop({ type: String, default: null, required: false })
  emailVerificationToken: string | null;

  @Prop({ type: Date, default: null, required: false })
  emailVerificationExpires: Date | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;
