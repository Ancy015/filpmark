const FEATURED_CATEGORIES = ['Juices', 'Fruits', 'Vegetables', 'Specials'];
const TRUST_POINTS = [
  { title: '100% Organic', text: 'Fresh-picked and carefully sourced for quality.' },
  { title: 'Secure Payment', text: 'Safe checkout and trusted payment handling.' },
  { title: 'Fast Delivery', text: 'Quick delivery across your local service area.' },
];
const TESTIMONIALS = [
  {
    name: 'Asha',
    text: 'The homepage feels premium now and the catalog is easy to browse.',
  },
  {
    name: 'Ravi',
    text: 'I like the featured categories and the clean product previews.',
  },
  {
    name: 'Meera',
    text: 'The layout is simple, professional, and works well on mobile too.',
  },
];

function Home({
  categories,
  trendingProducts,
  products,
  onJumpToProducts,
  onNavigateContact,
  fallbackImage,
  formatPrice,
  cartItemCount,
  cartPreviewEntries,
  cartPreviewLabel,
  cartPreviewOpen,
  setCartPreviewOpen,
  onOpenAuth,
  onCartToggle,
  currentUserLabel,
  isAuthenticated,
  searchTerm,
  setSearchTerm,
}) {
  const formatSuggestionLabel = (value) =>
    value
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const suggestionItems = normalizedSearch
    ? Array.from(
        new Map(
          products
            .flatMap((product) => [product.name || '', product.category || ''])
            .map((value) => value.trim())
            .filter(Boolean)
            .filter((value) => value.toLowerCase().includes(normalizedSearch))
            .map((value) => [value.toLowerCase(), value]),
        ).values(),
      )
        .map((value) => ({
          value,
          label: formatSuggestionLabel(value),
          isCategory: categories.includes(value),
        }))
        .slice(0, 8)
    : [];

  const handleSuggestionClick = (value) => {
    if (categories.includes(value)) {
      setSearchTerm('');
      onJumpToProducts(value);
      return;
    }

    setSearchTerm(value);
    onJumpToProducts('All');
  };

  return (
    <>
      <header className="hero" id="home">
        <div className="hero-overlay" />

        <div className="container nav-row">
          <div className="brand">
            <div className="brand-text">
              <span>FLIP</span>
              <strong>MARK</strong>
            </div>
          </div>

          <nav className="main-nav" aria-label="Primary navigation">
            <a href="#home">Home</a>
            <a href="#products">Products</a>
            <a href="#history">History</a>
            <button type="button" className="nav-link-button" onClick={onNavigateContact}>
              Contact
            </button>
          </nav>

          <div className="search-box">
            <div className="search-input-row">
              <input
                type="text"
                aria-label="Search products"
                placeholder="Search name or category"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button type="button" onClick={() => setSearchTerm('')}>
                Clear
              </button>
            </div>

            {suggestionItems.length > 0 && (
              <div className="search-suggestions" role="listbox" aria-label="Product suggestions">
                {suggestionItems.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className="search-suggestion-item"
                    onClick={() => handleSuggestionClick(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="container home-hero-grid">
          <div className="home-hero-copy">
            <p className="eyebrow">Freshness Delivered Daily</p>
            <h1>Professional grocery shopping, built for speed and trust.</h1>
            <p>
              Discover fresh juices, fruits, vegetables, and weekly specials in a clean experience that feels like a
              modern home page, not just a product list.
            </p>
            <div className="hero-actions">
              <a className="primary-cta" href="#products">
                Shop Now
              </a>
              <a className="secondary-cta" href="#featured-categories">
                Explore Categories
              </a>
            </div>
            <div className="hero-metrics" aria-label="Store highlights">
              <div>
                <strong>4.9/5</strong>
                <span>Customer rating</span>
              </div>

          <div className="header-actions">
            <button type="button" className="auth-link-button" onClick={onOpenAuth}>
              {isAuthenticated ? currentUserLabel : 'Login / Signup'}
            </button>

            <div className="cart-preview-wrap" onMouseEnter={() => setCartPreviewOpen(true)} onMouseLeave={() => setCartPreviewOpen(false)}>
              <button
                type="button"
                className="cart-icon-button"
                aria-label={`Cart with ${cartItemCount} item${cartItemCount === 1 ? '' : 's'}`}
                aria-expanded={cartPreviewOpen}
                onClick={() => {
                  setCartPreviewOpen((previous) => !previous);
                  onCartToggle();
                }}
              >
                Cart
                <span className="cart-badge">{cartItemCount}</span>
              </button>

              {cartPreviewOpen ? (
                <div className="cart-preview-dropdown" role="dialog" aria-label={cartPreviewLabel}>
                  <div className="cart-preview-head">
                    <strong>{cartPreviewLabel}</strong>
                    <button type="button" className="link-button" onClick={onCartToggle}>
                      Open
                    </button>
                  </div>

                  {cartPreviewEntries.length === 0 ? (
                    <p className="cart-preview-empty">Your cart is empty. Add products to see them here.</p>
                  ) : (
                    <div className="cart-preview-list">
                      {cartPreviewEntries.map(({ product, quantity }) => (
                        <div className="cart-preview-item" key={product.id}>
                          <span>{product.name || 'Unnamed product'}</span>
                          <strong>x{quantity}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
              <div>
                <strong>24h</strong>
                <span>Fresh dispatch</span>
              </div>
              <div>
                <strong>100+</strong>
                <span>Curated items</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="history-section container" id="history">
          <div className="section-heading">
            <p className="eyebrow">Featured Categories</p>
            <h2>Quick access to the products people shop first</h2>
          </div>
          <div className="history-grid featured-grid">
            {FEATURED_CATEGORIES.map((categoryName) => (
              <button
                key={categoryName}
                type="button"
                className="history-card featured-card"
                onClick={() => onJumpToProducts(categoryName)}
              >
                <h3>{categoryName}</h3>
                <p>Tap to jump straight into this collection.</p>
              </button>
            ))}
          </div>
        </section>

        <section className="promotion-section">
          <div className="container promotion-card">
            <div>
              <p className="eyebrow">Promotion</p>
              <h2>Summer Sale - 20% Off Juices</h2>
              <p>Limited-time seasonal offer with a clear countdown-style look and strong visual emphasis.</p>
            </div>
            <div className="promotion-countdown" aria-label="Promotion countdown">
              <div>
                <strong>02</strong>
                <span>Days</span>
              </div>
              <div>
                <strong>14</strong>
                <span>Hours</span>
              </div>
              <div>
                <strong>36</strong>
                <span>Min</span>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-section container">
          <div className="section-heading">
            <p className="eyebrow">Why choose us</p>
            <h2>Built to feel trustworthy from the first scroll</h2>
          </div>
          <div className="trust-grid">
            {TRUST_POINTS.map((point) => (
              <div className="trust-card" key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="testimonials-section container">
          <div className="section-heading">
            <p className="eyebrow">Customer Reviews</p>
            <h2>Short feedback that adds social proof</h2>
          </div>
          <div className="testimonial-grid">
            {TESTIMONIALS.map((testimonial) => (
              <article className="testimonial-card" key={testimonial.name}>
                <div className="stars" aria-label="5 star rating">
                  ★★★★★
                </div>
                <p>{testimonial.text}</p>
                <strong>{testimonial.name}</strong>
              </article>
            ))}
          </div>
        </section>       
      </main>
    </>
  );
}

export default Home;
