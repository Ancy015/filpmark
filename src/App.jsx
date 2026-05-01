import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import Home from './Home';

const PRODUCTS_TABLE = 'product';
const SORT_OPTIONS = ['default', 'price-asc', 'price-desc', 'name-asc'];
const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-label="No image available">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f4efe6" />
          <stop offset="100%" stop-color="#e7dcc8" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#bg)" />
      <rect x="80" y="70" width="480" height="340" rx="28" fill="#fffaf2" stroke="#d6cab5" stroke-width="6" />
      <circle cx="250" cy="190" r="40" fill="#d9c7ab" />
      <path d="M170 360l95-110 70 75 58-44 77 79H170z" fill="#d8c7ab" />
      <text x="320" y="278" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#7b6f5f">No image available</text>
    </svg>
  `);

function formatPrice(value) {
  if (value === null || value === undefined || value === '') {
    return 'Price on request';
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return `₹${numericValue.toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) {
    return 'Created date unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortMode, setSortMode] = useState('default');
  const [viewMode, setViewMode] = useState('grid');
  const [cartItems, setCartItems] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setLoading(true);
      setError('');
      console.info(`Loading products from ${PRODUCTS_TABLE}`);

      const { data, error: fetchError } = await supabase
        .from(PRODUCTS_TABLE)
        .select('id, name, price, category, imageUrl, created_at')
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        console.error('Supabase product fetch failed:', fetchError);
        setProducts([]);
        setError(fetchError.message || 'Unable to load products from Supabase.');
        setLoading(false);
        return;
      }

      const nextProducts = Array.isArray(data) ? data : [];

      console.info(`Loaded ${nextProducts.length} product(s) from Supabase.`);
      if (nextProducts.length === 0) {
        console.warn(
          'Supabase returned 0 rows for anon client. If your table has data, check RLS SELECT policy for public.product.',
        );
        setError('No rows returned from Supabase. If your table has data, allow anon SELECT on public.product (RLS policy).');
      }

      setProducts(nextProducts);
      setLoading(false);
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const categoryNames = new Set();

    for (const product of products) {
      const categoryName = (product.category || '').trim();

      if (categoryName) {
        categoryNames.add(categoryName);
      }
    }

    return ['All', ...Array.from(categoryNames).sort((left, right) => left.localeCompare(right))];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedCategory = activeCategory.toLowerCase();

    let nextProducts = products.filter((product) => {
      const matchesCategory =
        activeCategory === 'All' || (product.category || '').trim().toLowerCase() === normalizedCategory;
      const searchableText = `${product.name || ''} ${product.category || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });

    if (sortMode === 'price-asc') {
      nextProducts = [...nextProducts].sort((left, right) => Number(left.price || 0) - Number(right.price || 0));
    }

    if (sortMode === 'price-desc') {
      nextProducts = [...nextProducts].sort((left, right) => Number(right.price || 0) - Number(left.price || 0));
    }

    if (sortMode === 'name-asc') {
      nextProducts = [...nextProducts].sort((left, right) => (left.name || '').localeCompare(right.name || ''));
    }

    return nextProducts;
  }, [activeCategory, products, searchTerm, sortMode]);

  const resultLabel = useMemo(() => {
    if (loading) {
      return 'Loading products...';
    }

    if (error) {
      return error;
    }

    return `${visibleProducts.length} product${visibleProducts.length === 1 ? '' : 's'} shown`;
  }, [error, loading, visibleProducts.length]);

  const sortLabel =
    sortMode === 'price-asc'
      ? 'Price: Low to High'
      : sortMode === 'price-desc'
        ? 'Price: High to Low'
        : sortMode === 'name-asc'
          ? 'Name: A to Z'
          : 'Default Sorting';

  const trendingProducts = products.slice(0, 4);

  const handleCategoryJump = (categoryName) => {
    setActiveCategory(categories.includes(categoryName) ? categoryName : 'All');

    const productsSection = document.getElementById('products');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddToCart = (productId) => {
    setCartItems((previous) => ({
      ...previous,
      [productId]: (previous[productId] || 0) + 1,
    }));
  };

  const getCartCount = (productId) => cartItems[productId] || 0;

  return (
    <div className="page-shell">
      <Home
        categories={categories}
        trendingProducts={trendingProducts}
        products={products}
        onJumpToProducts={handleCategoryJump}
        fallbackImage={FALLBACK_IMAGE}
        formatPrice={formatPrice}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <main>
        <section className="categories-section container" id="products">
          <h2>Trending Products</h2>

          <div className="trending-grid">
            {trendingProducts.length === 0 ? (
              <div className="empty-state">Loading trending products...</div>
            ) : (
              trendingProducts.map((product) => (
                <article className="trending-card" key={product.id}>
                  <div className="product-visual">
                    <img src={product.imageUrl || FALLBACK_IMAGE} alt={product.name || 'Product image'} />
                  </div>
                  <div className="product-meta">
                    <span className="product-category">{product.category || 'Uncategorized'}</span>
                    <h3>{product.name || 'Unnamed product'}</h3>
                    <div className="price-row">
                      <span className="price-label">Price</span>
                      <span className="price-now">{formatPrice(product.price)}</span>
                    </div>
                    <button
                      type="button"
                      className="primary-cta small-cta"
                      onClick={() => handleAddToCart(product.id)}
                    >
                      {getCartCount(product.id) > 0 ? `Add to Cart (${getCartCount(product.id)})` : 'Add to Cart'}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="categories-section-spacer">
            <h3>Browse all categories</h3>
          </div>

          <div className="categories-grid">
            {categories.map((categoryName) => (
              <button
                key={categoryName}
                type="button"
                className={`category-card${activeCategory === categoryName ? ' active' : ''}`}
                aria-pressed={activeCategory === categoryName}
                onClick={() => setActiveCategory(categoryName)}
              >
                <span className="category-image-wrap">
                  <img src={FALLBACK_IMAGE} alt={categoryName} />
                </span>
                <span className="category-name">{categoryName}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="products-section container">
          <div className="offer-banner" role="status" aria-live="polite">
            {resultLabel}
          </div>

          <div className="products-toolbar">
            <p>
              Showing {visibleProducts.length} result{visibleProducts.length === 1 ? '' : 's'}
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
            </p>

            <div className="toolbar-actions">
              <div className="filter-chips" aria-label="Quick category filter">
                <button type="button" className="filter-chip" onClick={() => setActiveCategory('All')}>
                  All
                </button>
                {categories
                  .filter((categoryName) => categoryName !== 'All')
                  .slice(0, 3)
                  .map((categoryName) => (
                    <button
                      key={categoryName}
                      type="button"
                      className="filter-chip"
                      onClick={() => setActiveCategory(categoryName)}
                    >
                      {categoryName}
                    </button>
                  ))}
              </div>

              <button
                type="button"
                className={`icon-button${viewMode === 'grid' ? ' active' : ''}`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                ▦
              </button>
              <button
                type="button"
                className={`icon-button${viewMode === 'list' ? ' active' : ''}`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                ☰
              </button>
              <button
                type="button"
                className="sort-button"
                onClick={() => {
                  const currentIndex = SORT_OPTIONS.indexOf(sortMode);
                  const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
                  setSortMode(SORT_OPTIONS[nextIndex]);
                }}
              >
                {sortLabel} ▾
              </button>
            </div>
          </div>

          <div className={`products-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {loading ? (
              <div className="empty-state">Loading products from Supabase...</div>
            ) : error ? (
              <div className="empty-state">{error}</div>
            ) : visibleProducts.length === 0 ? (
              <div className="empty-state">No products match your search or category filter.</div>
            ) : (
              visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-visual">
                    <img src={product.imageUrl || FALLBACK_IMAGE} alt={product.name || 'Product image'} />
                  </div>
                  <div className="product-meta">
                    <span className="product-category">{product.category || 'Uncategorized'}</span>
                    <h3>{product.name || 'Unnamed product'}</h3>
                    <div className="price-row">
                      <span className="price-label">Price</span>
                      <span className="price-now">{formatPrice(product.price)}</span>
                    </div>
                    <div className="price-row">
                      <span className="price-label">Created</span>
                      <span>{formatDate(product.created_at)}</span>
                    </div>
                    <button
                      type="button"
                      className="primary-cta small-cta"
                      onClick={() => handleAddToCart(product.id)}
                    >
                      {getCartCount(product.id) > 0 ? `Add to Cart (${getCartCount(product.id)})` : 'Add to Cart'}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
