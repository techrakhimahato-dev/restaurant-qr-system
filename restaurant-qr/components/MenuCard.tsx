import { MenuItem } from "@/types/menu";

type MenuCardProps = {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
};

export default function MenuCard({
  item,
  onAddToCart,
}: MenuCardProps) {
  return (
    <div className="border rounded-lg shadow p-5 mb-4">
      <h2 className="text-2xl font-semibold">
        {item.name}
      </h2>

      <p className="text-gray-600">
        Rs {item.price}
      </p>

      <p className="text-gray-600">
        {item.quantity}
      </p>

      <button
        onClick={() => onAddToCart(item)}
        className="mt-4 bg-black text-white px-5 py-2 rounded"
      >
        Add to Cart
      </button>
    </div>
  );
}