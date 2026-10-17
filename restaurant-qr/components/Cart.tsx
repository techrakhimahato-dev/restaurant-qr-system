import type { MenuItem } from "@/types/menu";

type CartProps = {
  cart: MenuItem[];
  onAdd: (item: MenuItem) => void;
  onRemove: (id: string | number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  checkoutError: string | null;
  orderId: string | null;
};

export default function Cart({
  cart,
  onAdd,
  onRemove,
  onSubmit,
  isSubmitting,
  checkoutError,
  orderId,
}: CartProps) {
  const itemCount = cart.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const total = cart.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);

  return (
    <section className="cart-panel" aria-labelledby="cart-title">
      <div className="cart-heading-row">
        <div>
          <p className="section-kicker">MADE FOR YOUR TABLE</p>
          <h2 id="cart-title">Your order</h2>
        </div>
        <span className="cart-count" aria-label={`${itemCount} items`}>{itemCount}</span>
      </div>

      {orderId && (
        <div className="order-confirmation" role="status" aria-live="polite">
          <span className="confirmation-icon" aria-hidden="true">✓</span>
          <div>
            <strong>Order received</strong>
            <p>Keep this order ID: <span className="order-id">{orderId}</span></p>
          </div>
        </div>
      )}

      {checkoutError && <p className="form-error" role="alert">{checkoutError}</p>}

      {cart.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon" aria-hidden="true">＋</div>
          <p className="empty-cart-title">Your order starts here</p>
          <p className="empty-cart-copy">Choose something from the menu and it will appear here.</p>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {cart.map((item) => {
              const quantity = item.quantity ?? 1;
              return (
                <li className="cart-item" key={item.id}>
                  <div className="cart-item-details">
                    <p className="cart-item-name">{item.name}</p>
                    <p className="cart-item-price">Rs {item.price} × {quantity}</p>
                  </div>
                  <div className="quantity-control" aria-label={`${item.name} quantity`}>
                    <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove one ${item.name}`}>−</button>
                    <span aria-live="polite">{quantity}</span>
                    <button type="button" onClick={() => onAdd(item)} disabled={quantity >= 99} aria-label={`Add one ${item.name}`}>+</button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="cart-total-row">
            <div><span>Estimated total</span><small>Confirmed when your order is saved</small></div>
            <strong>Rs {total}</strong>
          </div>

          <button className="checkout-button" type="button" onClick={onSubmit} disabled={isSubmitting || cart.length === 0}>
            {isSubmitting ? "Sending your order…" : "Place order"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
          <p className="checkout-note">No payment is collected on this screen.</p>
        </>
      )}
    </section>
  );
}
