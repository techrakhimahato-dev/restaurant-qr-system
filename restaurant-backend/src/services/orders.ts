import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import { HttpError } from "../lib/errors.ts";
import { MenuItem } from "../models/MenuItem.ts";
import { Order } from "../models/Order.ts";
import { RestaurantTable } from "../models/RestaurantTable.ts";
import type { CreateOrderInput } from "../validation/orders.ts";

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createOrder(input: CreateOrderInput) {
  const table = await RestaurantTable.findOne({
    tableId: input.tableId,
    isActive: true,
  }).select("_id tableId");
  if (!table) throw new HttpError(404, "Table was not found or is inactive");

  const requestedIds = input.items.map(
    (item) => new mongoose.Types.ObjectId(item.menuItemId),
  );
  const menuItems = await MenuItem.find({
    _id: { $in: requestedIds },
    isAvailable: true,
  }).select("_id name price");
  const menuById = new Map(
    menuItems.map((item) => [item._id.toString(), item]),
  );
  if (menuById.size !== input.items.length) {
    throw new HttpError(
      409,
      "One or more menu items do not exist or are unavailable",
    );
  }

  const orderItems = input.items.map(({ menuItemId, quantity }) => {
    const menuItem = menuById.get(menuItemId);
    if (!menuItem)
      throw new HttpError(
        409,
        "One or more menu items do not exist or are unavailable",
      );
    const unitPrice = money(menuItem.price);
    return {
      menuItem: menuItem._id,
      name: menuItem.name,
      unitPrice,
      quantity,
      lineTotal: money(unitPrice * quantity),
    };
  });
  const total = money(
    orderItems.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const receiptToken = randomBytes(32).toString("hex");
  const receiptTokenHash = createHash("sha256")
    .update(receiptToken)
    .digest("hex");

  // MongoDB stores the complete order and its item snapshots as one atomic document.
  const order = await Order.create({
    table: table._id,
    tableId: table.tableId,
    items: orderItems,
    total,
    receiptTokenHash,
  });

  return { order, receiptToken };
}

export async function getOrderById(orderId: string, receiptToken: string) {
  const receiptTokenHash = createHash("sha256")
    .update(receiptToken)
    .digest("hex");

  return Order.findOne({ _id: orderId, receiptTokenHash }).select(
    "tableId items total status createdAt updatedAt",
  );
}

export async function listOrders(options: {
  status?: string;
  tableId?: string;
  limit: number;
}) {
  const filter: Record<string, unknown> = {};
  if (options.status) filter.status = options.status;
  if (options.tableId) filter.tableId = options.tableId;
  return Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .select("tableId items total status createdAt updatedAt");
}

export async function updateOrderStatus(orderId: string, status: string) {
  return Order.findByIdAndUpdate(
    orderId,
    { status },
    { new: true, runValidators: true },
  ).select("tableId items total status createdAt updatedAt");
}
