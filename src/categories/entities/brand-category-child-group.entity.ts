import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class BrandCategoryChildGroup {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Brand',
    required: true,
    index: true,
  })
  brandId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'ChildCategory' }],
    default: [],
  })
  childCategoryIds: MongooseSchema.Types.ObjectId[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BrandCategoryChildGroupSchema = SchemaFactory.createForClass(
  BrandCategoryChildGroup,
);

BrandCategoryChildGroupSchema.index(
  { brandId: 1, categoryId: 1 },
  { unique: true },
);

export type BrandCategoryChildGroupDocument = BrandCategoryChildGroup &
  Document;
