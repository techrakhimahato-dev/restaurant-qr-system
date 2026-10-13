import { orderStatuses, type OrderStatus } from "../models/Order.ts";
import { HttpError } from "../lib/errors.ts";

export type CreateOrderInput = {
  tableId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
};

const objectIdPattern = /^[a-f\d]{24}$/i;
const tableIdPattern = /^[A-Za-z0-9_-]{1,64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateTableId(value: unknown): string {
  if (typeof value !== "string" || !tableIdPattern.test(value)) {
    throw new HttpError(400, "tableId must contain 1 to 64 letters, numbers, underscores, or hyphens");
  }
  return value;
}

export function validateCreateOrder(body: unknown): CreateOrderInput {
  if (!isRecord(body)) throw new HttpError(400, "Request body must be a JSON object");
  const allowedKeys = new Set(["tableId", "items"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    throw new HttpError(400, "Request body may contain only tableId and items");
  }

  const tableId = validateTableId(body.tableId);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw new HttpError(400, "items must contain between 1 and 50 entries");
  }

  const quantities = new Map<string, number>();
  for (const value of body.items) {
    if (!isRecord(value) || Object.keys(value).some((key) => key !== "menuItemId" && key !== "quantity")) {
      throw new HttpError(400, "Each item must contain only menuItemId and quantity");
    }
    if (typeof value.menuItemId !== "string" || !objectIdPattern.test(value.menuItemId)) {
      throw new HttpError(400, "Each menuItemId must be a valid MongoDB ObjectId");
    }
    if (typeof value.quantity !== "number" || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 99) {
      throw new HttpError(400, "Each quantity must be an integer from 1 to 99");
    }

    const id = value.menuItemId.toLowerCase();
    const newQuantity = (quantities.get(id) ?? 0) + value.quantity;
    if (newQuantity > 99) throw new HttpError(400, "Combined quantity for a menu item cannot exceed 99");
    quantities.set(id, newQuantity);
  }

  return {
    tableId,
    items: [...quantities].map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
  };
}

export function validateOrderStatus(value: unknown): OrderStatus {
  if (typeof value !== "string" || !orderStatuses.includes(value as OrderStatus)) {
    throw new HttpError(400, `status must be one of: ${orderStatuses.join(", ")}`);
  }
  return value as OrderStatus;
}
