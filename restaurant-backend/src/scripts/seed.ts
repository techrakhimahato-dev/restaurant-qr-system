import "dotenv/config";
import mongoose from "mongoose";
import { Category } from "../models/Category.ts";
import { MenuItem } from "../models/MenuItem.ts";
import { RestaurantTable } from "../models/RestaurantTable.ts";

const sampleMenu = [
  { name: "Chicken Momo", price: 180, category: "momo" },
  { name: "Buff Momo", price: 160, category: "momo" },
  { name: "Veg Momo", price: 150, category: "momo" },
  { name: "Laphing", price: 140, category: "street-food" },
  { name: "Chowmein", price: 200, category: "street-food" },
];

try {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  await mongoose.connect(uri);

  const momo = await Category.findOneAndUpdate(
    { slug: "momo" },
    { $set: { name: "Momo", isActive: true }, $setOnInsert: { slug: "momo" } },
    { upsert: true, new: true, runValidators: true },
  );
  const streetFood = await Category.findOneAndUpdate(
    { slug: "street-food" },
    { $set: { name: "Street Food", isActive: true }, $setOnInsert: { slug: "street-food" } },
    { upsert: true, new: true, runValidators: true },
  );
  const categories = { momo: momo._id, "street-food": streetFood._id };

  for (const item of sampleMenu) {
    await MenuItem.findOneAndUpdate(
      { name: item.name },
      { $set: { price: item.price, category: categories[item.category as keyof typeof categories], isAvailable: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }
  await RestaurantTable.findOneAndUpdate(
    { tableId: "1" },
    { $set: { name: "Table 1", isActive: true }, $setOnInsert: { tableId: "1" } },
    { upsert: true, new: true, runValidators: true },
  );

  console.info("Seeded two categories, five menu items, and table 1");
} catch (error) {
  const reason = error instanceof Error ? error.name : "UnknownError";
  console.error(`Unable to seed the database (${reason}). Check MONGODB_URI and database access.`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
