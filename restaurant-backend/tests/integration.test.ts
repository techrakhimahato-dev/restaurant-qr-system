import assert from "node:assert/strict";
import { setServers } from "node:dns";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Category } from "../src/models/Category.ts";
import { MenuItem } from "../src/models/MenuItem.ts";
import { Order } from "../src/models/Order.ts";
import { RestaurantTable } from "../src/models/RestaurantTable.ts";
import { formatMongoConnectionError } from "../src/config/mongoDiagnostics.ts";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);
if (dnsServers && dnsServers.length > 0) setServers(dnsServers);

const testUri = process.env.MONGODB_TEST_URI?.trim();
const { default: app } = await import("../src/app.ts");

test(
  "MongoDB integration: customer order flow and staff status update",
  {
    skip: testUri
      ? false
      : "Set MONGODB_TEST_URI to a dedicated *_test database",
  },
  async () => {
    if (!testUri) return;

    assertTestDatabaseUri(testUri);
    try {
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 8_000 });
    } catch (error) {
      const details = formatMongoConnectionError(error);
      throw new Error(
        `Could not connect to the test database (${details.category}): ${details.message}`,
      );
    }

    const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const categorySlug = `integration-${suffix}`;
    const tableId = `it-${suffix}`;
    const staffKeyBeforeTest = process.env.STAFF_API_KEY;
    let categoryId: mongoose.Types.ObjectId | undefined;
    let tableObjectId: mongoose.Types.ObjectId | undefined;
    let menuItemId: mongoose.Types.ObjectId | undefined;
    let orderId: string | undefined;
    let server: ReturnType<typeof app.listen> | undefined;

    try {
      const category = await Category.create({
        name: "Integration Test",
        slug: categorySlug,
      });
      categoryId = category._id;
      const table = await RestaurantTable.create({
        tableId,
        name: "Integration Test Table",
      });
      tableObjectId = table._id;
      const menuItem = await MenuItem.create({
        name: "Integration Test Momo",
        description: "Temporary test item",
        price: 180,
        category: category._id,
      });
      menuItemId = menuItem._id;

      server = app.listen(0);
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Could not get the test server address");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const healthResponse = await fetch(`${baseUrl}/api/health`);
      assert.equal(healthResponse.status, 200);

      const categoriesResponse = await fetch(`${baseUrl}/api/categories`);
      assert.equal(categoriesResponse.status, 200);
      const categoriesPayload = await categoriesResponse.json();
      assert.ok(
        categoriesPayload.categories.some(
          (entry: { slug: string }) => entry.slug === categorySlug,
        ),
      );

      const menuResponse = await fetch(`${baseUrl}/api/menu`);
      assert.equal(menuResponse.status, 200);
      const menuPayload = await menuResponse.json();
      assert.ok(
        menuPayload.items.some(
          (entry: { id: string }) => entry.id === menuItemId?.toString(),
        ),
      );

      const tableResponse = await fetch(`${baseUrl}/api/tables/${tableId}`);
      assert.equal(tableResponse.status, 200);
      assert.deepEqual((await tableResponse.json()).table, {
        id: tableId,
        name: "Integration Test Table",
      });

      const createResponse = await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: [{ menuItemId: menuItemId?.toString(), quantity: 2 }],
        }),
      });
      assert.equal(createResponse.status, 201);
      const createPayload = await createResponse.json();
      orderId = createPayload.order.id;
      assert.equal(createPayload.order.total, 360);
      assert.equal(createPayload.order.items[0].unitPrice, 180);

      const retrieveResponse = await fetch(`${baseUrl}/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${createPayload.receiptToken}`,
        },
      });
      assert.equal(retrieveResponse.status, 200);
      assert.equal((await retrieveResponse.json()).order.id, orderId);

      const wrongTokenResponse = await fetch(
        `${baseUrl}/api/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${"0".repeat(64)}`,
          },
        },
      );
      assert.equal(wrongTokenResponse.status, 404);

      const staffKey = `integration-${randomBytes(24).toString("hex")}`;
      process.env.STAFF_API_KEY = staffKey;
      const listResponse = await fetch(
        `${baseUrl}/api/orders?status=pending&tableId=${tableId}`,
        {
          headers: { Authorization: `Bearer ${staffKey}` },
        },
      );
      assert.equal(listResponse.status, 200);
      const listPayload = await listResponse.json();
      assert.ok(
        listPayload.orders.some(
          (order: { id: string }) => order.id === orderId,
        ),
      );

      const updateResponse = await fetch(
        `${baseUrl}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${staffKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "preparing" }),
        },
      );
      assert.equal(updateResponse.status, 200);
      assert.equal((await updateResponse.json()).order.status, "preparing");

      const persistedOrder = await Order.findById(orderId).lean();
      assert.equal(persistedOrder?.status, "preparing");
    } finally {
      if (server)
        await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        const cleanup = [
          ...(orderId ? [Order.deleteOne({ _id: orderId })] : []),
          ...(menuItemId ? [MenuItem.deleteOne({ _id: menuItemId })] : []),
          ...(tableObjectId
            ? [RestaurantTable.deleteOne({ _id: tableObjectId })]
            : []),
          ...(categoryId ? [Category.deleteOne({ _id: categoryId })] : []),
        ];
        await Promise.all(cleanup);
      } finally {
        if (staffKeyBeforeTest === undefined) delete process.env.STAFF_API_KEY;
        else process.env.STAFF_API_KEY = staffKeyBeforeTest;
        await mongoose.disconnect();
      }
    }
  },
);

function assertTestDatabaseUri(uri: string): void {
  let databaseName: string;
  try {
    const parsed = new URL(uri);
    if (!parsed.protocol.startsWith("mongodb")) throw new Error("scheme");
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("MONGODB_TEST_URI must be a valid MongoDB URI");
  }

  if (!/(?:^|[_-])test$/i.test(databaseName)) {
    throw new Error(
      "MONGODB_TEST_URI must target a database named 'test' or ending in '_test' or '-test'",
    );
  }
}
