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
import { Category } from "../src/models/Category.ts";
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
  let savedOrderData: Record<string, unknown> | undefined;
  try {
    RestaurantTable.findOne = (() => ({
      select: async () => ({ _id: tableObjectId, tableId: "1" }),
    })) as never;

    MenuItem.find = (() => ({
      select: async () => [
        { _id: menuObjectId, name: "Chicken Momo", price: 180 },
      ],
    })) as never;

    Order.create = (async (order: Record<string, unknown>) => {
      savedOrderData = order;
      return {
        ...order,
        _id: expectedOrderId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }) as never;
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
    assert.equal(typeof payload.receiptToken, "string");
    assert.equal(payload.receiptToken.length, 64);
    assert.equal(typeof savedOrderData?.receiptTokenHash, "string");
    assert.equal((savedOrderData?.receiptTokenHash as string).length, 64);
  } finally {
    RestaurantTable.findOne = savedMethods.findOne;
    MenuItem.find = savedMethods.find;
    Order.create = savedMethods.create;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("GET /api/orders/:orderId returns an order", async () => {
  const savedFindOne = Order.findOne;
  const server = app.listen(0);
  try {
    const fakeOrder = {
      _id: expectedOrderId,
      tableId: "1",
      items: [
        {
          menuItem: new mongoose.Types.ObjectId(firstId),
          name: "Chicken Momo",
          unitPrice: 180,
          quantity: 2,
          lineTotal: 360,
        },
      ],
      total: 360,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Order.findOne = (() => ({
      select: async () => fakeOrder,
    })) as never;

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not get the test server address");
    }

    const orderUrl =
      `http://127.0.0.1:${address.port}/api/orders/${expectedOrderId.toString()}`;
    const noTokenResponse = await fetch(orderUrl);
    assert.equal(noTokenResponse.status, 401);

    const response = await fetch(
      orderUrl,
      {
        headers: {
          Authorization: `Bearer ${"a".repeat(64)}`,
        },
      },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.order.id, expectedOrderId.toString());
    assert.equal(payload.order.total, 360);
  } finally {
    Order.findOne = savedFindOne;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("GET /api/menu returns available menu items", async () => {
  const savedFind = MenuItem.find;
  const categoryId = new mongoose.Types.ObjectId();
  MenuItem.find = (() => {
    const query = {
      sort() {
        return this;
      },
      populate() {
        return this;
      },
      lean: async () => [
        {
          _id: new mongoose.Types.ObjectId(firstId),
          name: "Chicken Momo",
          description: "Steamed dumplings",
          price: 180,
          category: { _id: categoryId, name: "Momo", slug: "momo" },
          isAvailable: true,
        },
      ],
    };
    return query;
  }) as never;

  try {
    const payload = await withAppServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/menu`);
      assert.equal(response.status, 200);
      return response.json();
    });
    assert.equal(payload.items[0].id, firstId);
    assert.equal(payload.items[0].price, 180);
    assert.equal(payload.items[0].category.slug, "momo");
  } finally {
    MenuItem.find = savedFind;
  }
});

test("GET /api/categories returns active categories", async () => {
  const savedFind = Category.find;
  const categoryId = new mongoose.Types.ObjectId();
  Category.find = (() => ({
    sort() {
      return this;
    },
    select() {
      return this;
    },
    lean: async () => [
      {
        _id: categoryId,
        name: "Momo",
        slug: "momo",
        description: "Dumplings",
      },
    ],
  })) as never;

  try {
    const payload = await withAppServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/categories`);
      assert.equal(response.status, 200);
      return response.json();
    });
    assert.equal(payload.categories[0].id, categoryId.toString());
    assert.equal(payload.categories[0].slug, "momo");
  } finally {
    Category.find = savedFind;
  }
});

test("GET /api/tables/:tableId returns an active table", async () => {
  const savedFindOne = RestaurantTable.findOne;
  RestaurantTable.findOne = (() => ({
    select() {
      return this;
    },
    lean: async () => ({ tableId: "1", name: "Table 1" }),
  })) as never;

  try {
    const payload = await withAppServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/tables/1`);
      assert.equal(response.status, 200);
      return response.json();
    });
    assert.deepEqual(payload.table, { id: "1", name: "Table 1" });
  } finally {
    RestaurantTable.findOne = savedFindOne;
  }
});

test("GET /api/orders returns recent orders with a valid staff token", async () => {
  const previousKey = process.env.STAFF_API_KEY;
  const savedFind = Order.find;
  const staffKey = "t".repeat(32);
  const fakeOrder = {
    _id: expectedOrderId,
    tableId: "1",
    items: [
      {
        menuItem: new mongoose.Types.ObjectId(firstId),
        name: "Chicken Momo",
        unitPrice: 180,
        quantity: 2,
        lineTotal: 360,
      },
    ],
    total: 360,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  process.env.STAFF_API_KEY = staffKey;
  Order.find = (() => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    select: async () => [fakeOrder],
  })) as never;

  try {
    const payload = await withAppServer(async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/api/orders?status=pending&tableId=1&limit=10`,
        {
          headers: { Authorization: `Bearer ${staffKey}` },
        },
      );
      assert.equal(response.status, 200);
      return response.json();
    });
    assert.equal(payload.count, 1);
    assert.equal(payload.orders[0].id, expectedOrderId.toString());
  } finally {
    Order.find = savedFind;
    if (previousKey === undefined) delete process.env.STAFF_API_KEY;
    else process.env.STAFF_API_KEY = previousKey;
  }
});

test("PATCH /api/orders/:orderId/status updates status for staff", async () => {
  const previousKey = process.env.STAFF_API_KEY;
  const savedFindByIdAndUpdate = Order.findByIdAndUpdate;
  const staffKey = "t".repeat(32);
  const updatedOrder = {
    _id: expectedOrderId,
    tableId: "1",
    items: [
      {
        menuItem: new mongoose.Types.ObjectId(firstId),
        name: "Chicken Momo",
        unitPrice: 180,
        quantity: 2,
        lineTotal: 360,
      },
    ],
    total: 360,
    status: "preparing",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  process.env.STAFF_API_KEY = staffKey;
  Order.findByIdAndUpdate = (() => ({
    select: async () => updatedOrder,
  })) as never;

  try {
    const payload = await withAppServer(async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/api/orders/${expectedOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${staffKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "preparing" }),
        },
      );
      assert.equal(response.status, 200);
      return response.json();
    });
    assert.equal(payload.order.id, expectedOrderId.toString());
    assert.equal(payload.order.status, "preparing");
  } finally {
    Order.findByIdAndUpdate = savedFindByIdAndUpdate;
    if (previousKey === undefined) delete process.env.STAFF_API_KEY;
    else process.env.STAFF_API_KEY = previousKey;
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
    const result = await createOrder({
      tableId: "1",
      items: [{ menuItemId: firstId, quantity: 2 }],
    });
    assert.equal((result.order as { total: number }).total, 360);
    assert.equal(result.receiptToken.length, 64);
    assert.equal(
      (savedOrder as { receiptTokenHash: string }).receiptTokenHash.length,
      64,
    );
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

test("GET /api/orders rejects requests without a staff token", async () => {
  const previousKey = process.env.STAFF_API_KEY;
  process.env.STAFF_API_KEY = "t".repeat(32);
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not get the test server address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/api/orders`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Valid staff bearer token required",
    });
  } finally {
    if (previousKey === undefined) delete process.env.STAFF_API_KEY;
    else process.env.STAFF_API_KEY = previousKey;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
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

async function withAppServer<T>(
  action: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not get the test server address");
    }
    return await action(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
