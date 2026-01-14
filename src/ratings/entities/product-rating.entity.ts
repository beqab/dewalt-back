import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class ProductRating {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  productId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  anonymousUserId: string; // UUID from localStorage

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number; // Rating value 1-5
}

export const ProductRatingSchema = SchemaFactory.createForClass(ProductRating);

// Create compound unique index to prevent duplicate votes
ProductRatingSchema.index(
  { productId: 1, anonymousUserId: 1 },
  { unique: true },
);

export type ProductRatingDocument = ProductRating & Document;
