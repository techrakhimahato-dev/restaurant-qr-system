import { MenuItem } from "@/types/menu";

type CartProps = {
  cart: MenuItem[];
  onAdd: (item: MenuItem) => void;
  onRemove: (id: number) => void;
};

export default function Cart({
  cart,
  onAdd,
  onRemove,
}: CartProps) {
  const total = cart.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );

  return (
    <div className="border rounded-lg p-5 mt-8">
      <h2 className="text-2xl font-bold mb-4">
        🛒 Cart
      </h2>

      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center mb-4"
            >
              <div>
                <h3 className="font-semibold">
                  {item.name}
                </h3>

                <p>
                  Rs {item.price} × {item.quantity}
                </p>
              </div>

              <div className="flex gap-3 items-center">

                <button
                  onClick={() => onRemove(item.id)}
                  className="bg-red-500 text-white px-3 rounded"
                >
                  -
                </button>

                <span>{item.quantity}</span>

                <button
                  onClick={() => onAdd(item)}
                  className="bg-green-500 text-white px-3 rounded"
                >
                  +
                </button>

              </div>
            </div>
          ))}

          <hr className="my-4" />

          <h3 className="font-bold text-xl">
            Total: Rs {total}
          </h3>

          <button className="w-full mt-4 bg-black text-white py-3 rounded">
            Place Order
          </button>
        </>
      )}
    </div>
  );
}