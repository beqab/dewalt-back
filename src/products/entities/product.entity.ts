import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Brand } from '../../categories/entities/brand.entity';
import { Category } from '../../categories/entities/category.entity';
import { ChildCategory } from '../../categories/entities/child-category.entity';
import type { LocalizedText } from '../../categories/types/localized-text.interface';
import { ProductSpec, ProductSpecSchema } from './product-spec.entity';

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  name: LocalizedText;

  @Prop({ type: Number, required: false, index: true })
  finaId?: number; // External FINA product id

  @Prop({ type: String, required: false, index: true })
  finaCode?: string; // External FINA product code

  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  description: LocalizedText;

  @Prop({ type: String, required: true })
  image: string; // Main product image URL

  @Prop({ type: [String], default: [] })
  images?: string[]; // Additional product images

  @Prop({ type: Number, required: true, min: 0 })
  price: number; // Current price

  @Prop({ type: Number, required: false, min: 0, default: 0 })
  originalPrice?: number; // Original price before discount

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  discount?: number; // Discount percentage (0-100)

  @Prop({ type: Number, default: 0, min: 0 })
  quantity: number; // Stock quantity

  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  rating: number; // Average rating (0-5)

  @Prop({ type: Number, default: 0, min: 0 })
  reviewCount: number; // Number of reviews

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  })
  brandId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ChildCategory',
    required: false,
  })
  childCategoryId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Number,
    required: false,
    default: null,
    enum: [null, 1, 2, 3, 4, 5],
  })
  sliderNumber: number | null;

  @Prop({ type: Number, required: false, default: 0, index: true })
  sortOrder: number;

  @Prop({ type: [ProductSpecSchema], default: [] })
  specs: ProductSpec[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

export type ProductDocument = Product & Document;

// Add indexes for better query performance
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ childCategoryId: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ quantity: 1 });
ProductSchema.index({ sliderNumber: 1 });
ProductSchema.index({ childCategoryId: 1, sortOrder: 1, createdAt: -1 });
