import type { MenuItem } from "@/types/menu";

type MenuCardProps = {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
};

function getCategoryName(category: MenuItem["category"]): string {
  if (typeof category === "string") return category;
  return category?.name ?? "From our kitchen";
}

export default function MenuCard({ item, onAddToCart }: MenuCardProps) {
  return (
    <article className="menu-card">
      <div className="menu-card-topline">
        <span className="menu-category-label">{getCategoryName(item.category)}</span>
        <span className="menu-card-mark" aria-hidden="true">✳</span>
      </div>

      <div className="menu-card-copy">
        <h3 className="menu-card-title">{item.name}</h3>
        {item.description ? (
          <p className="menu-card-description">{item.description}</p>
        ) : (
          <p className="menu-card-description menu-card-description-muted">Prepared to order</p>
        )}
      </div>

      <div className="menu-card-footer">
        <p className="menu-price">Rs {item.price}</p>
        <button
          type="button"
          className="add-to-order-button"
          onClick={() => onAddToCart(item)}
          aria-label={`Add ${item.name} to your order`}
        >
          <span>Add</span><span className="add-button-plus" aria-hidden="true">+</span>
        </button>
      </div>
    </article>
  );
}
