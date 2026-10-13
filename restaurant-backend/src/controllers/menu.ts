import type { RequestHandler } from "express";
import { Category } from "../models/Category.ts";
import { MenuItem } from "../models/MenuItem.ts";

export const getMenu: RequestHandler = async (_request, response) => {
  const rows = await MenuItem.find({ isAvailable: true })
    .sort({ name: 1 })
    .populate("category", "name slug")
    .lean();

  response.json({
    items: rows.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      category: item.category,
      isAvailable: item.isAvailable,
    })),
  });
};

export const getCategories: RequestHandler = async (_request, response) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).select("name slug description").lean();
  response.json({
    categories: categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
    })),
  });
};
