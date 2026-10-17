import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { HttpError } from "../lib/errors.ts";
import { createOrder, getOrderById, listOrders, updateOrderStatus } from "../services/orders.ts";
import { orderStatuses } from "../models/Order.ts";
import { validateCreateOrder, validateOrderStatus, validateTableId } from "../validation/orders.ts";

const objectIdPattern = /^[a-f\d]{24}$/i;

type OrderRecord = {
  _id: { toString(): string };
  tableId: string;
  items: Array<{
    menuItem: { toString(): string };
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  total: number;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
};

function serializeOrder(order: OrderRecord) {
  return {
    id: order._id.toString(),
    tableId: order.tableId,
    items: order.items.map((item: any) => ({
      menuItemId: item.menuItem.toString(),
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export const postOrder: RequestHandler = async (request, response) => {
  const input = validateCreateOrder(request.body);
  const { order, receiptToken } = await createOrder(input);
  response.status(201).json({ order: serializeOrder(order), receiptToken });
};

export const getOrder: RequestHandler = async (request, response) => {
  const orderId = request.params.orderId;
  if (!objectIdPattern.test(orderId)) throw new HttpError(400, "orderId must be a valid MongoDB ObjectId");
  const tokenMatch = /^Bearer ([a-f0-9]{64})$/i.exec(
    request.get("authorization") ?? "",
  );
  if (!tokenMatch) {
    throw new HttpError(401, "A valid receipt token is required");
  }
  const order = await getOrderById(orderId, tokenMatch[1]);
  if (!order) throw new HttpError(404, "Order was not found");
  response.json({ order: serializeOrder(order) });
};

export const getOrders: RequestHandler = async (request, response) => {
  const status = request.query.status;
  if (status !== undefined && (typeof status !== "string" || !orderStatuses.includes(status as (typeof orderStatuses)[number]))) {
    throw new HttpError(400, `status must be one of: ${orderStatuses.join(", ")}`);
  }
  const tableId = request.query.tableId === undefined ? undefined : validateTableId(request.query.tableId);
  const rawLimit = request.query.limit;
  const limit = rawLimit === undefined ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, "limit must be an integer from 1 to 100");

  const orders = await listOrders({ status: status as string | undefined, tableId, limit });
  response.json({ orders: orders.map(serializeOrder), count: orders.length });
};

export const patchOrderStatus: RequestHandler = async (request, response) => {
  const orderId = request.params.orderId;
  if (!mongoose.isValidObjectId(orderId) || !objectIdPattern.test(orderId)) {
    throw new HttpError(400, "orderId must be a valid MongoDB ObjectId");
  }
  if (!request.body || Object.keys(request.body).some((key) => key !== "status")) {
    throw new HttpError(400, "Request body may contain only status");
  }
  const status = validateOrderStatus(request.body.status);
  const order = await updateOrderStatus(orderId, status);
  if (!order) throw new HttpError(404, "Order was not found");
  response.json({ order: serializeOrder(order) });
};
