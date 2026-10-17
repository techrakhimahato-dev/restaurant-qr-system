"use client";
import { useEffect, useState } from "react";

type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

type Order = {
  id: string;
  tableId: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    menuItemId: string;
  }>;
};

export default function OrderBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const newOrders = orders.filter((order) => order.status === "pending");
  const preparingOrders = orders.filter(
    (order) => order.status === "preparing",
  );
  const readyOrders = orders.filter((order) => order.status === "ready");

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/staff/orders", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load orders.");
        }
        setOrders(data.orders);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Could not load orders.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrders();
  }, []);

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setError(null);
    setUpdatingOrderId(orderId);

    try {
      const response = await fetch(`/api/staff/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update order status.");
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? data.order : order,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update order status.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function renderOrders(
    statusOrders: Order[],
    emptyMessage: string,
    nextStatus: OrderStatus,
    buttonLabel: string,
  ) {
    if (statusOrders.length === 0) return <p>{emptyMessage}</p>;

    return statusOrders.map((order) => (
      <article className="order-card" key={order.id}>
        <h3>Table {order.tableId}</h3>
        <ul>
          {order.items.map((item) => (
            <li key={item.menuItemId}>
              {item.quantity} × {item.name}
            </li>
          ))}
        </ul>
        <p>Total: Rs. {order.total}</p>
        <button
          type="button"
          disabled={updatingOrderId === order.id}
          onClick={() => void updateOrderStatus(order.id, nextStatus)}
        >
          {updatingOrderId === order.id ? "Updating..." : buttonLabel}
        </button>
      </article>
    ));
  }

  if (isLoading) return <p>Loading orders...</p>;

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <div className="order-board">
        <section>
          <h2>New Orders</h2>
          {renderOrders(
            newOrders,
            "No new orders right now.",
            "preparing",
            "Start preparing",
          )}
        </section>
        <section>
          <h2>Preparing</h2>
          {renderOrders(
            preparingOrders,
            "No orders are being prepared right now.",
            "ready",
            "Mark ready",
          )}
        </section>
        <section>
          <h2>Ready to Serve</h2>
          {renderOrders(
            readyOrders,
            "No orders are waiting to be served.",
            "completed",
            "Complete order",
          )}
        </section>
      </div>
    </>
  );
}
