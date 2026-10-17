import mongoose, { Schema } from "mongoose";
import type { Types } from "mongoose";
import { OrderItemSchema, type OrderItemSnapshot } from "./OrderItem.ts";

export const orderStatuses = ["pending", "preparing", "ready", "completed", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

const orderSchema = new Schema(
  {
    table: { type: Schema.Types.ObjectId, ref: "RestaurantTable", required: true },
    tableId: { type: String, required: true, index: true },
    items: { type: [OrderItemSchema], required: true, validate: [(items: unknown[]) => items.length > 0, "Order must contain at least one item"] },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: orderStatuses, default: "pending", index: true },
    receiptTokenHash: { type: String, select: false },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

export const Order = mongoose.models.Order ?? mongoose.model("Order", orderSchema);
export type OrderDocumentShape = {
  _id: Types.ObjectId;
  tableId: string;
  items: OrderItemSnapshot[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
};
