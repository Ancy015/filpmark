import { useEffect, useMemo, useState } from 'react';
import { categories, productsByCategory } from './productData';

const sortOptions = ['default', 'price-asc', 'price-desc', 'name-asc'];
const quantityOptions = [
  { key: '1kg', label: '1kg', multiplier: 1 },
  { key: '500g', label: '500g', multiplier: 0.5 },
  { key: '1l', label: '1L', multiplier: 1 },
  { key: 'pack', label: 'Pack', multiplier: 1 },
  { key: 'piece', label: 'Piece', multiplier: 1 },
];

const quantityMultiplierByKey = quantityOptions.reduce((accumulator, option) => {
  accumulator[option.key] = option.multiplier;
  return accumulator;
}, {});

function formatRupees(amount) {
  return `₹${amount.toFixed(2)}`;
}

function App() {
  const [activeCategory, setActiveCategory] = useState('Vegetables');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortMode, setSortMode] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [isFirstOrder, setIsFirstOrder] = useState(true);
  const [orderStatus, setOrderStatus] = useState('idle');
  const [authMode, setAuthMode] = useState('login');
  const [savedAccount, setSavedAccount] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const activeProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let items = [...(productsByCategory[activeCategory] || [])];

    if (normalizedSearch) {
      items = items.filter((item) => item.name.toLowerCase().includes(normalizedSearch));
    }

    if (sortMode === 'price-asc') {
      items.sort((left, right) => left.price - right.price);
    }

    if (sortMode === 'price-desc') {
      items.sort((left, right) => right.price - left.price);
    }

    if (sortMode === 'name-asc') {
      items.sort((left, right) => left.name.localeCompare(right.name));
    }

    return items;
  }, [activeCategory, searchTerm, sortMode]);

  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(activeProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProducts = activeProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCategoryClick = (categoryName) => {
    setActiveCategory(categoryName);
    setCurrentPage(1);
    setSearchTerm('');
    setSearchInput('');
    setSortMode('default');
    setViewMode('grid');
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleSortClick = () => {
    const currentIndex = sortOptions.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortMode(sortOptions[nextIndex]);
    setCurrentPage(1);
  };

  const sortLabel =
    sortMode === 'price-asc'
      ? 'Price: Low to High'
      : sortMode === 'price-desc'
        ? 'Price: High to Low'
        : sortMode === 'name-asc'
          ? 'Name: A to Z'
          : 'Default Sorting';

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.lineTotal, 0);
  }, [cartItems]);

  const discountAmount = isFirstOrder ? cartSubtotal * 0.5 : 0;
  const finalTotal = cartSubtotal - discountAmount;

  useEffect(() => {
    const clickAnimationHandler = (event) => {
      const interactiveTarget = event.target.closest('button, a, .tap-action');

      if (!interactiveTarget) {
        return;
      }

      interactiveTarget.classList.remove('click-bounce');
      void interactiveTarget.offsetWidth;
      interactiveTarget.classList.add('click-bounce');
    };

    document.addEventListener('click', clickAnimationHandler);

    return () => {
      document.removeEventListener('click', clickAnimationHandler);
    };
  }, []);

  useEffect(() => {
    if (orderStatus !== 'ordered') {
      return undefined;
    }

    const outForDeliveryTimer = setTimeout(() => setOrderStatus('out-for-delivery'), 1200);
    const deliveredTimer = setTimeout(() => setOrderStatus('delivered'), 2600);

    return () => {
      clearTimeout(outForDeliveryTimer);
      clearTimeout(deliveredTimer);
    };
  }, [orderStatus]);

  const getQuantityKey = (product) => {
    return selectedQuantities[product.id] || '1kg';
  };

  const getPriceForSelection = (product, quantityKey) => {
    const multiplier = quantityMultiplierByKey[quantityKey] || 1;
    return product.price * multiplier;
  };

  const handleQuantityChange = (productId, quantityKey) => {
    setSelectedQuantities((previous) => ({
      ...previous,
      [productId]: quantityKey,
    }));
  };

  const handleAddToCart = (product) => {
    const quantityKey = getQuantityKey(product);
    const linePrice = getPriceForSelection(product, quantityKey);
    const cartKey = `${product.id}::${quantityKey}`;

    setCartItems((previousItems) => {
      const existing = previousItems.find((item) => item.cartKey === cartKey);

      if (!existing) {
        return [
          ...previousItems,
          {
            cartKey,
            productId: product.id,
            name: product.name,
            category: product.category,
            imageUrl: product.imageUrl,
            quantityKey,
            count: 1,
            lineTotal: linePrice,
          },
        ];
      }

      return previousItems.map((item) => {
        if (item.cartKey !== cartKey) {
          return item;
        }

        return {
          ...item,
          count: item.count + 1,
          lineTotal: item.lineTotal + linePrice,
        };
      });
    });
  };

  const handleRemoveCartItem = (cartKey) => {
    setCartItems((previousItems) => previousItems.filter((item) => item.cartKey !== cartKey));
  };

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      return;
    }

    if (!loggedInUser) {
      setAuthMode('login');
      setAuthMessage('Please login before placing order.');
      return;
    }

    const isConfirmed = window.confirm('Confirm your order now?');

    if (!isConfirmed) {
      return;
    }

    setOrderStatus('ordered');

    if (isFirstOrder) {
      setIsFirstOrder(false);
    }
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();

    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthMessage('Email and password are required.');
      return;
    }

    if (authMode === 'signup') {
      if (!authForm.name.trim()) {
        setAuthMessage('Name is required for signup.');
        return;
      }

      setSavedAccount({
        name: authForm.name.trim(),
        email: authForm.email.trim().toLowerCase(),
        password: authForm.password,
      });

      setAuthMessage('Signup successful. Please login to place order.');
      setAuthMode('login');
      setAuthForm((previous) => ({ ...previous, password: '' }));
      return;
    }

    if (!savedAccount) {
      const quickAccount = {
        name: authForm.name.trim() || 'Customer',
        email: authForm.email.trim().toLowerCase(),
        password: authForm.password,
      };

      setSavedAccount(quickAccount);
      setLoggedInUser({
        name: quickAccount.name,
        email: quickAccount.email,
      });
      setAuthMessage('Login successful. New account created and signed in.');
      setAuthForm({ name: '', email: '', password: '' });
      return;
    }

    const normalizedEmail = authForm.email.trim().toLowerCase();

    if (savedAccount.email !== normalizedEmail || savedAccount.password !== authForm.password) {
      setAuthMessage('Invalid login details. Try again.');
      return;
    }

    setLoggedInUser({
      name: savedAccount.name,
      email: savedAccount.email,
    });
    setAuthMessage('Login successful. You can place your order now.');
    setAuthForm({ name: '', email: '', password: '' });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setAuthMessage('You have logged out. Login again to place order.');
    setOrderStatus('idle');
  };

  if (!loggedInUser) {
    return (
      <div className="auth-page-shell">
        <div className="auth-page-card" id="login">
          <h1>Welcome to FLIPMARK</h1>
          <p>Login first, then continue to your product page.</p>

          <div className="auth-mode-switch">
            <button
              type="button"
              className={`auth-mode-btn${authMode === 'login' ? ' active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-mode-btn${authMode === 'signup' ? ' active' : ''}`}
              onClick={() => setAuthMode('signup')}
            >
              Signup
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit} noValidate>
            {authMode === 'signup' ? (
              <input
                type="text"
                name="name"
                value={authForm.name}
                onChange={handleAuthChange}
                placeholder="Full name"
              />
            ) : null}

            <input
              type="text"
              name="email"
              value={authForm.email}
              onChange={handleAuthChange}
              placeholder="Email"
              autoComplete="username"
            />
            <input
              type="password"
              name="password"
              value={authForm.password}
              onChange={handleAuthChange}
              placeholder="Password"
            />
            <button type="submit" className="auth-submit-btn">
              {authMode === 'signup' ? 'Create Account' : 'Login'}
            </button>
          </form>

          {authMessage ? <p className="auth-message">{authMessage}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-overlay" />
        <div className="top-strip">
          <div className="container strip-inner">
            <div className="strip-left">
              <div className="marquee" aria-label="Health quote">
                <span>Let food be thy medicine and medicine be thy food</span>
              </div>
              <button type="button" className="language-pill tap-action">English</button>
            </div>
            <div className="strip-right">
              <button type="button" className="top-strip-action tap-action">Wishlist</button>
              <button type="button" className="top-strip-action tap-action" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="container nav-row">
          <div className="brand">
            <div className="brand-mark">F</div>
            <div className="brand-text">
              <span>FLIP</span>
              <strong>MARK</strong>
            </div>
          </div>

          <nav className="main-nav" aria-label="Primary">
            <a href="#home">Home</a>
            <a href="#shop">Shop</a>
            <a href="#about">About</a>
            <a href="#pages">Pages</a>
            <a href="#blog">Blog</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="search-box">
            <input
              type="text"
              aria-label="Search products"
              placeholder="Type Here..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button type="button" onClick={handleSearch}>Search</button>
          </div>
        </div>

        <div className="hero-content container">
          <h1>FLIPMARK</h1>
          <p>"Freshness, Flavor, and Essentials—All in One Place.”</p>
        </div>
      </header>

      <main>
        <section className="categories-section container" id="shop">
          
          <h2>Organic Goodness for Everyday Life.</h2>

          <div className="categories-grid">
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                className={`category-card${activeCategory === category.name ? ' active' : ''}`}
                aria-pressed={activeCategory === category.name}
                onClick={() => handleCategoryClick(category.name)}
              >
                <span className="category-image-wrap">
                  <img src={category.image} alt={category.name} />
                </span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="products-section container">
          <div className="offer-banner" role="status" aria-live="polite">
            🔥 Super Saver Offer: First Order Gets 50% OFF | Fresh Deals Every Day
          </div>

          <div className="products-toolbar">
            <p>
              Showing {activeProducts.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-
              {Math.min(safePage * pageSize, activeProducts.length)} of {activeProducts.length} items
            </p>
            <div className="toolbar-actions">
              <div className="filter-chips" aria-label="Quick category filter">
                <button type="button" className="filter-chip" onClick={() => handleCategoryClick('Vegetables')}>
                  Vegetables
                </button>
                <button type="button" className="filter-chip" onClick={() => handleCategoryClick('Fruits')}>
                  Fruits
                </button>
                <button type="button" className="filter-chip" onClick={() => handleCategoryClick('Masala')}>
                  Spices
                </button>
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
              <button type="button" className="sort-button" onClick={handleSortClick}>
                {sortLabel} ▾
              </button>
            </div>
          </div>

          <div className={`products-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {pagedProducts.length === 0 ? (
              <div className="empty-state">
                No products match your current search or category filter.
              </div>
            ) : (
              pagedProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <span className="weight">{product.weight}</span>
                  <div className="product-visual">
                    <img src={product.imageUrl} alt={product.name} />
                  </div>
                  <div className="product-meta">
                    <span className="product-category">{product.category}</span>
                    <h3>{product.name}</h3>
                    <div className="price-row">
                      <span className="price-label">Price</span>
                      <span className="price-now">{formatRupees(getPriceForSelection(product, getQuantityKey(product)))}</span>
                    </div>

                    <div className="product-actions">
                      <select
                        className="quantity-select"
                        value={getQuantityKey(product)}
                        onChange={(event) => handleQuantityChange(product.id, event.target.value)}
                        aria-label={`Select quantity for ${product.name}`}
                      >
                        {quantityOptions.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>

                      <button type="button" className="add-cart-btn" onClick={() => handleAddToCart(product)}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="pagination" aria-label="Pagination">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  className={`pagination-link${safePage === page ? ' active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <div className="cart-summary" id="checkout">
            <h3>Your Cart / Order</h3>

            {cartItems.length === 0 ? (
              <p className="cart-empty">No items selected yet. Add products to continue.</p>
            ) : (
              <div className="cart-items-list">
                {cartItems.map((item) => (
                  <div key={item.cartKey} className="cart-item-row">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.quantityKey.toUpperCase()} x {item.count}</p>
                    </div>

                    <div className="cart-item-right">
                      <span>{formatRupees(item.lineTotal)}</span>
                      <button type="button" className="remove-cart-btn" onClick={() => handleRemoveCartItem(item.cartKey)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="cart-total-box">
              <p><span>Subtotal:</span> <strong>{formatRupees(cartSubtotal)}</strong></p>
              <p><span>First Order Discount (50%):</span> <strong>- {formatRupees(discountAmount)}</strong></p>
              <p className="final-total"><span>Total:</span> <strong>{formatRupees(finalTotal)}</strong></p>
            </div>

            <button
              type="button"
              className="place-order-btn"
              onClick={handlePlaceOrder}
            >
              Place Order
            </button>

            {orderStatus !== 'idle' ? (
              <div className="order-flow" aria-live="polite">
                <p className="order-success">Order confirmed successfully ✅</p>
                <p className={orderStatus === 'ordered' ? 'flow-step active' : 'flow-step'}>Ordered</p>
                <p className={orderStatus === 'out-for-delivery' ? 'flow-step active' : 'flow-step'}>Out for Delivery</p>
                <p className={orderStatus === 'delivered' ? 'flow-step active' : 'flow-step'}>Delivered</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="container footer-grid">
            <div className="footer-brand-block">
              <div className="brand footer-brand">
                <div className="brand-mark">F</div>
                <div className="brand-text">
                  <span>FLIP</span>
                  <strong>MARK</strong>
                </div>
              </div>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>
            </div>

            <div>
              <h4>Useful Pages</h4>
              <a href="#about">About Us</a>
              <a href="#contact">Contact</a>
              <a href="#help">Help Center</a>
              <a href="#careers">Career</a>
              <a href="#policy">Policy</a>
              <a href="#flash">Flash Sale</a>
            </div>

            <div>
              <h4>Help Center</h4>
              <a href="#payments">Payments</a>
              <a href="#shipping">Shipping</a>
              <a href="#returns">Product Returns</a>
              <a href="#faq">FAQ</a>
              <a href="#checkout">Checkout</a>
              <a href="#offers">Other Issues</a>
            </div>

            <div>
              <h4>Contacts</h4>
              <p>76 W Street Name, New York, NY 10014</p>
              <p>(123) 456-78-90</p>
              <p>(123) 456-78-91</p>
              <p>sales@example.com</p>
            </div>

            <div>
              <h4>Store Information</h4>
              <a href="#store">Store Information</a>
              <a href="#about">About Store</a>
              <a href="#best">Bestsellers</a>
              <a href="#latest">Latest Products</a>
              <a href="#discounts">New Discounts</a>
              <a href="#sale">Sale Products</a>
            </div>

            <div>
              <h4>Download App</h4>
              <div className="app-badges">
                <div className="badge">Google Play</div>
                <div className="badge">App Store</div>
              </div>
            </div>
          </div>

          <div className="container footer-bottom">
            <div className="footer-links">
              <a href="#home">Home</a>
              <a href="#about">About Us</a>
              <a href="#blog">Blogs</a>
              <a href="#shop">Shop</a>
              <a href="#contact">Contact Us</a>
            </div>
            <div className="payment-strip">
              <span>VISA</span>
              <span>MC</span>
              <span>PayPal</span>
              <span>Amex</span>
              <span>GPay</span>
            </div>
          </div>
        </div>

        <div className="footer-legal container">
          <p>© 2022 Flipmark Store. All Rights Reserved.</p>
          <div>
            <a href="#terms">Terms and Conditions</a>
            <a href="#privacy">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;