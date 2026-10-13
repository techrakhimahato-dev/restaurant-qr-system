import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/lib/errors.ts";
import {
  validateCreateOrder,
  validateOrderStatus,
  validateTableId,
} from "../src/validation/orders.ts";
import { requireStaffKey } from "../src/middleware/staffAuth.ts";
import healthRouter from "../src/routes/health.ts";
import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.ts";
import { Order } from "../src/models/Order.ts";
import { RestaurantTable } from "../src/models/RestaurantTable.ts";
import { createOrder } from "../src/services/orders.ts";
import { formatMongoConnectionError } from "../src/config/mongoDiagnostics.ts";
import app from "../src/app.ts";

test("POST /api/orders rejects an empty body", async () => {
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not get the test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/orders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    assert.equal(response.status, 400);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

const firstId = "65f000000000000000000001";
const secondId = "65f000000000000000000002";
const expectedOrderId = new mongoose.Types.ObjectId();

test("POST /api/orders returns an order ID for a valid order", async () => {
  const server = app.listen(0);
  const savedMethods = {
    findOne: RestaurantTable.findOne,
    find: MenuItem.find,
    create: Order.create,
  };
  const tableObjectId = new mongoose.Types.ObjectId();
  const menuObjectId = new mongoose.Types.ObjectId(firstId);
try{
  RestaurantTable.findOne = (() => ({
    select: async () => ({ _id: tableObjectId, tableId: "1" }),
  })) as never;

  MenuItem.find = (() => ({
    select: async () => [
      { _id: menuObjectId, name: "Chicken Momo", price: 180 },
    ],
  })) as never;

  Order.create = (async (order: Record<string, unknown>) => ({
  ...order,
  _id: expectedOrderId,
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
})) as never;
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Could not get the test server address");
}

const response = await fetch(
  `http://127.0.0.1:${address.port}/api/orders`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: "1",
      items: [{ menuItemId: firstId, quantity: 2 }],
    }),
  },
);

assert.equal(response.status, 201);
const payload = await response.json();
assert.equal(payload.order.id, expectedOrderId.toString());
} finally {
  RestaurantTable.findOne = savedMethods.findOne;
  MenuItem.find = savedMethods.find;
  Order.create = savedMethods.create;
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
});



test("accepts valid order lines and merges duplicate menu item IDs", () => {
  const result = validateCreateOrder({
    tableId: "table-1",
    items: [
      { menuItemId: firstId, quantity: 2 },
      { menuItemId: firstId.toUpperCase(), quantity: 1 },
      { menuItemId: secondId, quantity: 4 },
    ],
  });

  assert.deepEqual(result, {
    tableId: "table-1",
    items: [
      { menuItemId: firstId, quantity: 3 },
      { menuItemId: secondId, quantity: 4 },
    ],
  });
});

test("calculates the order total from database menu prices", async () => {
  const savedMethods = {
    findOne: RestaurantTable.findOne,
    find: MenuItem.find,
    create: Order.create,
  };
  const tableObjectId = new mongoose.Types.ObjectId();
  const menuObjectId = new mongoose.Types.ObjectId(firstId);
  let savedOrder: unknown;

  RestaurantTable.findOne = (() => ({
    select: async () => ({ _id: tableObjectId, tableId: "1" }),
  })) as never;
  MenuItem.find = (() => ({
    select: async () => [
      { _id: menuObjectId, name: "Chicken Momo", price: 180 },
    ],
  })) as never;
  Order.create = (async (order: unknown) => {
    savedOrder = order;
    return order;
  }) as never;

  try {
    const order = await createOrder({
      tableId: "1",
      items: [{ menuItemId: firstId, quantity: 2 }],
    });
    assert.equal((order as { total: number }).total, 360);
    assert.equal(
      (savedOrder as { items: Array<{ unitPrice: number; lineTotal: number }> })
        .items[0].unitPrice,
      180,
    );
    assert.equal(
      (savedOrder as { items: Array<{ unitPrice: number; lineTotal: number }> })
        .items[0].lineTotal,
      360,
    );
  } finally {
    RestaurantTable.findOne = savedMethods.findOne;
    MenuItem.find = savedMethods.find;
    Order.create = savedMethods.create;
  }
});

test("rejects malformed table IDs, order bodies, menu IDs, and quantities", () => {
  assert.throws(() => validateTableId("table 1"), HttpError);
  assert.throws(() => validateCreateOrder([]), HttpError);
  assert.throws(
    () => validateCreateOrder({ tableId: "1", items: [] }),
    HttpError,
  );
  assert.throws(
    () =>
      validateCreateOrder({
        tableId: "1",
        extra: true,
        items: [{ menuItemId: firstId, quantity: 1 }],
      }),
    HttpError,
  );
  assert.throws(
    () =>
      validateCreateOrder({
        tableId: "1",
        items: [{ menuItemId: "bad", quantity: 1 }],
      }),
    HttpError,
  );
  assert.throws(
    () =>
      validateCreateOrder({
        tableId: "1",
        items: [{ menuItemId: firstId, quantity: 1, price: 0.01 }],
      }),
    HttpError,
  );
  assert.throws(
    () =>
      validateCreateOrder({
        tableId: "1",
        items: [{ menuItemId: firstId, quantity: 0 }],
      }),
    HttpError,
  );
  assert.throws(
    () =>
      validateCreateOrder({
        tableId: "1",
        items: [
          { menuItemId: firstId, quantity: 60 },
          { menuItemId: firstId, quantity: 40 },
        ],
      }),
    HttpError,
  );
  assert.throws(
    () =>
      validateCreateOrder({
        tableId: "1",
        items: [{ menuItemId: firstId, quantity: 1.5 }],
      }),
    HttpError,
  );
});

test("accepts only defined order states", () => {
  assert.equal(validateOrderStatus("preparing"), "preparing");
  assert.throws(() => validateOrderStatus("paid"), HttpError);
});

test("keeps staff routes disabled without a configured key", () => {
  const previous = process.env.STAFF_API_KEY;
  delete process.env.STAFF_API_KEY;
  const response = mockResponse();
  requireStaffKey({ get: () => undefined } as never, response as never, () =>
    assert.fail("next must not run"),
  );
  assert.equal(response.statusCode, 503);
  if (previous !== undefined) process.env.STAFF_API_KEY = previous;
});

test("health reports an unavailable database when MongoDB is disconnected", () => {
  const handler = (
    healthRouter as unknown as {
      stack: Array<{
        route: {
          stack: Array<{
            handle: (request: unknown, response: unknown) => void;
          }>;
        };
      }>;
    }
  ).stack[0].route.stack[0].handle;
  const response = mockResponse();
  handler({}, response);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.payload, {
    status: "unavailable",
    database: "disconnected",
  });
});

test("classifies MongoDB failures and removes connection credentials from diagnostics", () => {
  assert.equal(
    formatMongoConnectionError({
      name: "MongoServerError",
      code: 18,
      message: "Authentication failed",
    }).category,
    "authentication",
  );
  assert.equal(
    formatMongoConnectionError({
      name: "MongoNetworkError",
      code: "ENOTFOUND",
      message: "querySrv ENOTFOUND",
    }).category,
    "DNS",
  );
  assert.equal(
    formatMongoConnectionError({
      name: "MongoParseError",
      message: "Invalid scheme",
    }).category,
    "invalid URI",
  );
  assert.equal(
    formatMongoConnectionError({
      name: "MongoServerSelectionError",
      message: "Server selection timed out",
    }).category,
    "timeout",
  );
  const diagnostic = formatMongoConnectionError(
    new Error("failed mongodb+srv://person:secret@cluster.example/db"),
  );
  assert.equal(diagnostic.message.includes("secret"), false);
  assert.equal(diagnostic.message.includes("person"), false);
  assert.equal(diagnostic.message.includes("[redacted MongoDB URI]"), true);
});

function mockResponse() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
}
