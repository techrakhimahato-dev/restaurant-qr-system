import type { RequestHandler } from "express";
import { HttpError } from "../lib/errors.ts";
import { RestaurantTable } from "../models/RestaurantTable.ts";
import { validateTableId } from "../validation/orders.ts";

export const getTable: RequestHandler = async (request, response) => {
  const tableId = validateTableId(request.params.tableId);
  const table = await RestaurantTable.findOne({ tableId, isActive: true }).select("tableId name").lean();
  if (!table) throw new HttpError(404, "Table was not found or is inactive");

  response.json({ table: { id: table.tableId, name: table.name } });
};
