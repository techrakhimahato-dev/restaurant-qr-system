import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 90 },
    description: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Category = mongoose.models.Category ?? mongoose.model("Category", categorySchema);
