import mongoose, { Schema } from "mongoose";

const restaurantTableSchema = new Schema(
  {
    tableId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 64,
      match: /^[A-Za-z0-9_-]+$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const RestaurantTable = mongoose.models.RestaurantTable ?? mongoose.model("RestaurantTable", restaurantTableSchema);
