import mongoose, { Schema } from "mongoose";
import type { Types } from "mongoose";

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 800 },
    price: { type: Number, required: true, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    isAvailable: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const MenuItem = mongoose.models.MenuItem ?? mongoose.model("MenuItem", menuItemSchema);
export type MenuItemDocument = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  category: Types.ObjectId;
  isAvailable: boolean;
};
