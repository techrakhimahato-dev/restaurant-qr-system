export default function HomePage() {
  return (
    <main className="restaurant-page home-page" id="top">
      <div className="page-shell">
        <header className="site-header home-header">
          <a className="brand-lockup" href="#top" aria-label="Himalayan Restaurant home">
            <span className="brand-mark" aria-hidden="true">H</span>
            <span className="brand-copy"><span className="brand-name">Himalayan</span><span className="brand-subtitle">Restaurant · Nepal</span></span>
          </a>
          <span className="home-open-label"><span className="table-badge-dot" /> MADE FRESH, WITH CARE</span>
        </header>
        <section className="home-welcome">
          <p className="eyebrow"><span className="eyebrow-line" /> WELCOME TO OUR TABLE</p>
          <h1>Good food.<br /><em>Good company.</em></h1>
          <p>Scan the QR code on your table to explore our menu and place an order. We’ll take it from here.</p>
          <div className="home-illustration" aria-hidden="true"><div className="art-sun" /><div className="art-arch art-arch-back" /><div className="art-arch art-arch-front" /><div className="art-table"><span /><span /><span /></div><span className="art-stamp">H · R</span></div>
          <small>FRESHLY PREPARED · ALWAYS WELCOMING</small>
        </section>
        <footer className="site-footer"><a className="footer-brand" href="#top">Himalayan<span>.</span></a><p>Good food, shared well.</p><span className="back-to-top">EST. WITH CARE</span></footer>
      </div>
    </main>
  );
}
