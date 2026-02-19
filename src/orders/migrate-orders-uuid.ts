/**
 * One-time migration: add uuid to existing orders that don't have it.
 * Run: npx ts-node -r tsconfig-paths/register src/orders/migrate-orders-uuid.ts
 */
import * as crypto from 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';

function buildOrderCode(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const randomPart = crypto
    .randomBytes(3)
    .toString('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  return `ORD-${y}${m}${d}-${randomPart}`;
}

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));

  const ordersWithoutUuid = await orderModel
    .find({ $or: [{ uuid: { $exists: false } }, { uuid: null }, { uuid: '' }] })
    .exec();

  if (ordersWithoutUuid.length === 0) {
    console.log('All orders already have uuid.');
    await app.close();
    return;
  }

  const usedUuids = new Set(
    (
      await orderModel
        .find({ uuid: { $exists: true, $ne: null } })
        .select('uuid')
        .lean()
    )
      .map((o) => o.uuid)
      .filter(Boolean),
  );

  for (const order of ordersWithoutUuid) {
    let uuid: string;
    do {
      uuid = buildOrderCode();
    } while (usedUuids.has(uuid));
    usedUuids.add(uuid);

    await orderModel.updateOne({ _id: order._id }, { $set: { uuid } });
  }

  console.log(`Migrated ${ordersWithoutUuid.length} orders.`);
  await app.close();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
