"use client";

import { useState } from "react";
import Cart from "@/components/Cart";
import MenuCard from "@/components/MenuCard";
import { menu } from "@/data/menu";
import { MenuItem } from "@/types/menu";

type Props = {
  tableId: string;
};

export default function TableClient({ tableId }: Props) {
  const [cart, setCart] = useState<MenuItem[]>([]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);

      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i,
        );
      }

      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: (item.quantity || 1) - 1 }
            : item,
        )
        .filter((item) => (item.quantity || 0) > 0),
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-bold">Himalayan Restaurant</h1>

      <h2 className="text-xl mt-2 mb-8">Table {tableId}</h2>

      {menu.map((item) => (
        <MenuCard key={item.id} item={item} onAddToCart={addToCart} />
      ))}

      <Cart cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
    </div>
  );
}
