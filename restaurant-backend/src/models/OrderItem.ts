import { Schema } from "mongoose";
import type { Types } from "mongoose";

// Embedded in Order so the historical price and item name are preserved.
export const OrderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

export type OrderItemSnapshot = {
  menuItem: Types.ObjectId;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};
