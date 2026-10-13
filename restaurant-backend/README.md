# Restaurant QR API

Express 5 and TypeScript API backed by MongoDB and Mongoose. Node.js 22.6 or newer runs the TypeScript source through Node's built-in type stripping, so no transpilation package is required. This strips types at runtime; it does not perform static type checking.

## Setup

From this directory:

```sh
npm install
```

Set `MONGODB_URI`, `PORT`, `FRONTEND_URL`, and `STAFF_API_KEY` in `.env`. If `.env` already exists, keep it and add any missing variables; do not replace its contents. `.env.example` shows the expected names and local-development defaults. The MongoDB URI should point to a development database while developing.

Run the API and load sample categories, menu items, and table 1:

```sh
npm run seed
npm run dev
```

The seed script upserts its sample records, so it can be run again safely against a development database. For a production deployment, set a long random `STAFF_API_KEY`; staff routes reject requests when it is absent or shorter than 32 characters. This shared bearer key is a basic gate, not account-based or role-based authentication.

Run validation tests with `npm test`. Run the server in production with `npm start`. Use Node.js 22.6 or newer.

## API

All routes are under `/api`. Menu and category responses use `{ items: [...] }` and `{ categories: [...] }`; table lookup returns `{ table: ... }`. Orders use `{ order: ... }`.

| Method and path | Purpose | Access |
| --- | --- | --- |
| `GET /api/health` | API and MongoDB readiness | Public |
| `GET /api/menu` | Available menu items, including MongoDB IDs | Public |
| `GET /api/categories` | Active categories | Public |
| `GET /api/tables/:tableId` | Validate an active QR table | Public |
| `POST /api/orders` | Create an order | Public |
| `GET /api/orders/:orderId` | Retrieve an order by ID | Public; share the ID only with the customer who placed it |
| `GET /api/orders?status=pending&limit=50` | List recent orders; optional `status`, `tableId`, and `limit` filters | Staff bearer key |
| `PATCH /api/orders/:orderId/status` | Update an order status | Staff bearer key |

Create-order body (the browser must use IDs returned by `GET /api/menu`):

```json
{
  "tableId": "1",
  "items": [
    { "menuItemId": "65f000000000000000000001", "quantity": 2 }
  ]
}
```

The server looks up active tables and available menu items, calculates prices from MongoDB, and embeds item name/price/quantity snapshots in the order. The client must not submit prices. A successful request returns HTTP 201 with `order.id`, `order.total`, and `order.status`.

Status update body:

```json
{ "status": "preparing" }
```

Allowed statuses are `pending`, `preparing`, `ready`, `completed`, and `cancelled`. Staff requests send `Authorization: Bearer <STAFF_API_KEY>`.

## Frontend connection

The customer table page calls this API at `http://localhost:4000/api` by default. To use another address, set `NEXT_PUBLIC_API_URL` in the frontend environment, for example `https://api.example.com/api`. The API's `FRONTEND_URL` may contain a comma-separated list of permitted browser origins.

## Data model and protection notes

`Category`, `MenuItem`, and `RestaurantTable` are separate MongoDB collections. `Order` stores `OrderItem` subdocuments with the purchased item name and unit price, so later menu edits do not change historical receipts. MongoDB writes each order and all its items as one document. Public order lookup is by MongoDB ObjectId; add customer identity or a separate receipt token before exposing order lookup in a public deployment. The staff API key is a transitional shared secret; add proper staff accounts, authorization, rate limits, and secret rotation before production use. Payments and Socket.IO are not implemented.
