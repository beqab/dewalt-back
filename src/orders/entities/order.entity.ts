import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../user/entities/user.entity';

export enum OrderStatus {
  Pending = 'pending',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Failed = 'failed',
  Paid = 'paid',
}

export enum DeliveryType {
  Tbilisi = 'tbilisi',
  Region = 'region',
}

export interface LocalizedText {
  ka: string;
  en: string;
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Product.name,
    required: true,
  })
  productId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: {
      ka: { type: String, required: true },
      en: { type: String, required: true },
    },
    required: true,
  })
  name: LocalizedText;

  @Prop({ type: String, required: true })
  image: string; // Main product image URL

  @Prop({ type: String, required: false, index: true })
  finaCode?: string; // External FINA product code

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotal: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: String, required: true, unique: true })
  uuid: string;

  @Prop({
    type: String,
    enum: ['ka', 'en'],
    default: 'ka',
    required: false,
  })
  locale: 'ka' | 'en';

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  surname: string;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: true })
  personalId: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String, required: true })
  address: string;

  @Prop({
    type: String,
    enum: Object.values(DeliveryType),
    required: true,
  })
  deliveryType: DeliveryType;

  @Prop({ type: Number, required: true, min: 0 })
  deliveryPrice: number;

  @Prop({ type: Number, required: true, min: 0 })
  subtotal: number;

  @Prop({ type: Number, required: true, min: 0 })
  total: number;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.Pending,
  })
  status: OrderStatus;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: false,
  })
  userId?: MongooseSchema.Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
export type OrderDocument = Order & Document;
