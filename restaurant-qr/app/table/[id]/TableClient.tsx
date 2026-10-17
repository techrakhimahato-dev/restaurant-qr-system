"use client";

import { useEffect, useMemo, useState } from "react";
import Cart from "@/components/Cart";
import MenuCard from "@/components/MenuCard";
import RestaurantNav from "@/components/RestaurantNav";
import type { MenuItem } from "@/types/menu";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"
).replace(/\/$/, "");

type ApiError = { error?: string };

async function responseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ApiError | null;
  return payload?.error ?? `Request failed (${response.status})`;
}

function categoryName(category: MenuItem["category"]): string {
  if (typeof category === "string") return category;
  return category?.name ?? "From our kitchen";
}

export default function TableClient({ tableId }: { tableId: string }) {
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tableName, setTableName] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTableAndMenu() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [tableResponse, menuResponse] = await Promise.all([
          fetch(`${API_BASE}/tables/${encodeURIComponent(tableId)}`),
          fetch(`${API_BASE}/menu`),
        ]);
        if (!tableResponse.ok) throw new Error(await responseError(tableResponse));
        if (!menuResponse.ok) throw new Error(await responseError(menuResponse));

        const tablePayload = await tableResponse.json();
        const menuPayload = await menuResponse.json();
        if (!Array.isArray(menuPayload.items)) throw new Error("Menu response was invalid");

        if (!cancelled) {
          setTableName(tablePayload.table?.name ?? `Table ${tableId}`);
          setMenu(menuPayload.items.map((item: MenuItem) => ({ ...item, id: String(item.id) })));
          setCart([]);
          setOrderId(null);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load the menu");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadTableAndMenu();
    return () => { cancelled = true; };
  }, [tableId]);

  const categories = useMemo(
    () => ["All", ...new Set(menu.map((item) => categoryName(item.category)))],
    [menu],
  );
  const visibleMenu = activeCategory === "All"
    ? menu
    : menu.filter((item) => categoryName(item.category) === activeCategory);
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  function addToCart(item: MenuItem) {
    setCheckoutError(null);
    setCart((previous) => {
      const current = previous.find((line) => line.id === item.id);
      if (current) return previous.map((line) => line.id === item.id
        ? { ...line, quantity: Math.min(99, (line.quantity ?? 1) + 1) }
        : line);
      return [...previous, { ...item, quantity: 1 }];
    });
  }

  function removeFromCart(id: string | number) {
    setCart((previous) => previous
      .map((item) => item.id === id ? { ...item, quantity: (item.quantity ?? 1) - 1 } : item)
      .filter((item) => (item.quantity ?? 0) > 0));
  }

  async function placeOrder() {
    if (cart.length === 0 || isSubmitting) return;
    setCheckoutError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: cart.map((item) => ({ menuItemId: String(item.id), quantity: item.quantity ?? 1 })),
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const payload = await response.json();
      if (typeof payload.order?.id !== "string") throw new Error("Order response was invalid");
      setOrderId(payload.order.id);
      setCart([]);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not place the order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="top" className="restaurant-page">
      <div className="page-shell">
        <RestaurantNav tableName={tableName ?? `Table ${tableId}`} cartCount={cartCount} />

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> GOOD FOOD, GOOD COMPANY</p>
            <h1 id="hero-title">A little taste<br />of the <em>Himalayas.</em></h1>
            <p className="hero-description">Made with care, inspired by the mountains, and served fresh to your table.</p>
            <a className="hero-cta" href="#menu">Explore the menu <span aria-hidden="true">↓</span></a>
            <div className="hero-footnote"><span>01</span><span>FRESHLY PREPARED · ALWAYS WELCOMING</span></div>
          </div>
          <div className="hero-art" aria-label="Decorative teal and cream restaurant illustration" role="img">
            <div className="art-sun" />
            <div className="art-arch art-arch-back" />
            <div className="art-arch art-arch-front" />
            <div className="art-table"><span /><span /><span /></div>
            <p className="art-caption">A seat is waiting<br />just for you.</p>
            <span className="art-stamp">H · R</span>
          </div>
        </section>

        <section className="menu-section" id="menu" aria-labelledby="menu-title">
          <div className="section-heading">
            <div><p className="eyebrow">FROM OUR KITCHEN</p><h2 id="menu-title">The menu<span>.</span></h2></div>
            <p className="section-intro">Find a new favorite, or settle in with an old one.</p>
          </div>

          <div className="menu-layout">
            <aside className="menu-aside">
              <span className="aside-number">01 / MENU</span>
              <p>Thoughtfully made.<br />Joyfully shared.</p>
              {!isLoading && !loadError && categories.length > 1 && (
                <nav className="category-nav" aria-label="Filter menu by category">
                  {categories.map((category) => (
                    <button key={category} type="button" className={activeCategory === category ? "category-filter active" : "category-filter"} onClick={() => setActiveCategory(category)}>
                      {category}<span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </nav>
              )}
            </aside>

            <div className="menu-content">
              {isLoading && <p className="status-message" role="status">Setting the table and bringing up the menu…</p>}
              {loadError && <div className="status-message error-message" role="alert"><strong>We couldn’t load the menu.</strong><p>{loadError}</p><small>Check that the ordering service is running, then refresh this page.</small></div>}
              {!isLoading && !loadError && menu.length === 0 && <p className="status-message">The menu is being prepared. Please check back soon.</p>}
              {!isLoading && !loadError && menu.length > 0 && visibleMenu.length === 0 && <p className="status-message">No dishes in this category yet.</p>}
              <div className="menu-grid">
                {!isLoading && !loadError && visibleMenu.map((item) => <MenuCard key={item.id} item={item} onAddToCart={addToCart} />)}
              </div>
            </div>
          </div>
        </section>

        <section id="your-order" className="order-section" aria-labelledby="order-section-title">
          <div className="order-section-copy"><p className="eyebrow">AT YOUR TABLE</p><h2 id="order-section-title">Make it a meal.</h2><p>Add a few favorites and we’ll get your order to the kitchen.</p></div>
          <Cart cart={cart} onAdd={addToCart} onRemove={removeFromCart} onSubmit={placeOrder} isSubmitting={isSubmitting} checkoutError={checkoutError} orderId={orderId} />
        </section>

        <footer className="site-footer"><a className="footer-brand" href="#top">Himalayan<span>.</span></a><p>Good food, shared well.</p><a href="#top" className="back-to-top">BACK TO TOP ↑</a></footer>
      </div>
    </main>
  );
}
