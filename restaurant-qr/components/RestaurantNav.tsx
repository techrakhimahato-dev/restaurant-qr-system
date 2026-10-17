type RestaurantNavProps = {
  tableName: string;
  cartCount: number;
};

export default function RestaurantNav({ tableName, cartCount }: RestaurantNavProps) {
  return (
    <header className="site-header">
      <a className="brand-lockup" href="#top" aria-label="Himalayan Restaurant home">
        <span className="brand-mark" aria-hidden="true">H</span>
        <span className="brand-copy">
          <span className="brand-name">Himalayan</span>
          <span className="brand-subtitle">Restaurant · Nepal</span>
        </span>
      </a>

      <nav className="primary-nav" aria-label="Main navigation">
        <a href="#menu">Menu</a>
        <a className="nav-order-link" href="#your-order">
          Your order <span className="nav-cart-count">{cartCount}</span>
        </a>
      </nav>

      <p className="table-badge">
        <span className="table-badge-dot" aria-hidden="true" />
        {tableName}
      </p>
    </header>
  );
}
