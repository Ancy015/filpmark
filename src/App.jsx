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
  const [isCartPanelOpen, setIsCartPanelOpen] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [orderStatus, setOrderStatus] = useState('idle');
  const [orderMeta, setOrderMeta] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [accounts, setAccounts] = useState([]);
  const [orderHistoryByEmail, setOrderHistoryByEmail] = useState({});
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [authForm, setAuthForm] = useState({
    name: '',
    userId: '',
    loginId: '',
    email: '',
    password: '',
  });

  const allProducts = useMemo(() => {
    return Object.values(productsByCategory).flat();
  }, []);

  const activeProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let items = normalizedSearch ? [...allProducts] : [...(productsByCategory[activeCategory] || [])];

    if (normalizedSearch) {
      items = items.filter((item) => {
        const searchableText = `${item.name} ${item.category} ${item.weight}`.toLowerCase();
        return searchableText.includes(normalizedSearch);
      });
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
  }, [activeCategory, allProducts, searchTerm, sortMode]);

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
    setSearchTerm(searchInput.trim());
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

  const normalizedLoggedInEmail = loggedInUser?.email?.toLowerCase() || '';
  const emailOrderHistory = orderHistoryByEmail[normalizedLoggedInEmail] || [];
  const isFirstOrderForEmail = Boolean(loggedInUser) && emailOrderHistory.length === 0;
  const discountAmount = isFirstOrderForEmail ? cartSubtotal * 0.5 : 0;
  const finalTotal = cartSubtotal - discountAmount;
  const deliveryAddress = 'Door 24, Green Park Street, Chennai - 600028';

  const orderStatusLabel =
    orderStatus === 'ordered'
      ? 'Ordered'
      : orderStatus === 'out-for-delivery'
        ? 'Out for Delivery'
        : orderStatus === 'delivered'
          ? 'Delivered'
          : 'Idle';

  const openHistoryPanel = () => {
    setIsCartPanelOpen(true);
    setShowOrderHistory(true);
  };

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
    const storedAccounts = window.localStorage.getItem('flipmark-accounts-v1');
    const storedOrderHistory = window.localStorage.getItem('flipmark-order-history-v1');

    if (storedAccounts) {
      setAccounts(JSON.parse(storedAccounts));
    }

    if (storedOrderHistory) {
      setOrderHistoryByEmail(JSON.parse(storedOrderHistory));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('flipmark-accounts-v1', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    window.localStorage.setItem('flipmark-order-history-v1', JSON.stringify(orderHistoryByEmail));
  }, [orderHistoryByEmail]);

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

  useEffect(() => {
    if (!loggedInUser || !orderMeta || orderStatus === 'idle') {
      return;
    }

    const userEmail = loggedInUser.email.toLowerCase();

    setOrderHistoryByEmail((previous) => {
      const existingOrders = previous[userEmail] || [];
      const updatedOrders = existingOrders.map((order) => {
        if (order.orderId !== orderMeta.orderId) {
          return order;
        }

        return {
          ...order,
          status: orderStatus,
        };
      });

      return {
        ...previous,
        [userEmail]: updatedOrders,
      };
    });
  }, [loggedInUser, orderMeta, orderStatus]);

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

    setIsCartPanelOpen(true);
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

    const newOrderId = `FM-${Date.now().toString().slice(-6)}`;
    const newPlacedAt = new Date().toLocaleString();

    setOrderStatus('ordered');
    setOrderMeta({
      orderId: newOrderId,
      placedAt: newPlacedAt,
      customerName: loggedInUser.name,
      customerEmail: loggedInUser.email,
    });

    const emailKey = loggedInUser.email.toLowerCase();
    const orderedItems = cartItems.map((item) => ({
      name: item.name,
      quantityKey: item.quantityKey,
      count: item.count,
      lineTotal: item.lineTotal,
    }));

    setOrderHistoryByEmail((previous) => {
      const existingOrders = previous[emailKey] || [];

      return {
        ...previous,
        [emailKey]: [
          {
            orderId: newOrderId,
            placedAt: newPlacedAt,
            status: 'ordered',
            items: orderedItems,
            subtotal: cartSubtotal,
            discount: discountAmount,
            total: finalTotal,
          },
          ...existingOrders,
        ],
      };
    });

    setIsCartPanelOpen(true);
    setShowOrderHistory(false);
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

    if (authMode === 'signup') {
      const name = authForm.name.trim();
      const userId = authForm.userId.trim();
      const email = authForm.email.trim().toLowerCase();
      const password = authForm.password;

      if (!name || !userId || !email || !password) {
        setAuthMessage('Name, User ID, email and password are required for signup.');
        return;
      }

      const emailTaken = accounts.some((account) => account.email === email);
      const userIdTaken = accounts.some((account) => account.userId.toLowerCase() === userId.toLowerCase());

      if (emailTaken) {
        setAuthMessage('This email is already registered. Please login.');
        setAuthMode('login');
        return;
      }

      if (userIdTaken) {
        setAuthMessage('This User ID already exists. Please use another one.');
        return;
      }

      setAccounts((previous) => [
        ...previous,
        {
          name,
          userId,
          email,
          password,
        },
      ]);

      setAuthMessage('Signup successful. Login with email or User ID.');
      setAuthMode('login');
      setAuthForm({
        name: '',
        userId: '',
        loginId: '',
        email: '',
        password: '',
      });

      return;
    }

    const loginId = authForm.loginId.trim().toLowerCase();
    const password = authForm.password;

    if (!loginId || !password) {
      setAuthMessage('User ID or email and password are required.');
      return;
    }

    const matchedAccount = accounts.find((account) => {
      return account.email === loginId || account.userId.toLowerCase() === loginId;
    });

    if (!matchedAccount) {
      const fallbackEmail = loginId.includes('@') ? loginId : `${loginId}@flipmark.local`;
      const fallbackUserId = loginId.includes('@') ? loginId.split('@')[0] : loginId;

      setAccounts((previous) => {
        const existingAccount = previous.find((account) => account.email === fallbackEmail || account.userId.toLowerCase() === fallbackUserId);

        if (existingAccount) {
          return previous;
        }

        return [
          ...previous,
          {
            name: fallbackUserId || 'Customer',
            userId: fallbackUserId || 'customer',
            email: fallbackEmail,
            password,
          },
        ];
      });

      setLoggedInUser({
        name: fallbackUserId || 'Customer',
        email: fallbackEmail,
        userId: fallbackUserId || 'customer',
      });
      setAuthMessage('Login successful. New account created and opened.');
      setAuthForm({
        name: '',
        userId: '',
        loginId: '',
        email: '',
        password: '',
      });
      return;
    }

    setLoggedInUser({
      name: matchedAccount.name,
      email: matchedAccount.email,
      userId: matchedAccount.userId,
    });
    setAuthMessage('Login successful. You can place your order now.');
    setAuthForm({
      name: '',
      userId: '',
      loginId: '',
      email: '',
      password: '',
    });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setAuthMessage('You have logged out. Login again to place order.');
    setOrderStatus('idle');
    setOrderMeta(null);
    setIsCartPanelOpen(false);
    setShowOrderHistory(false);
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

            {authMode === 'signup' ? (
              <input
                type="text"
                name="userId"
                value={authForm.userId}
                onChange={handleAuthChange}
                placeholder="Create User ID"
              />
            ) : null}

            {authMode === 'signup' ? (
              <input
                type="text"
                name="email"
                value={authForm.email}
                onChange={handleAuthChange}
                placeholder="Email"
                autoComplete="username"
              />
            ) : (
              <input
                type="text"
                name="loginId"
                value={authForm.loginId}
                onChange={handleAuthChange}
                placeholder="Email or User ID"
                autoComplete="username"
              />
            )}

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
            <button type="button" className="link-button" onClick={openHistoryPanel}>
              History
            </button>
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
              {searchTerm.trim() ? ` (Search: "${searchTerm.trim()}")` : ''}
            </p>
            <div className="toolbar-actions">
              <button
                type="button"
                className="cart-drawer-toggle"
                onClick={() => {
                  setIsCartPanelOpen(true);
                  setShowOrderHistory(false);
                }}
              >
                My Order ({cartItems.length})
              </button>

              <button
                type="button"
                className="cart-drawer-toggle"
                onClick={() => {
                  setIsCartPanelOpen(true);
                  setShowOrderHistory(true);
                }}
              >
                History ({emailOrderHistory.length})
              </button>

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
        </section>
      </main>

      <aside className={`cart-drawer${isCartPanelOpen ? ' open' : ''}`} id="checkout" aria-label="Order drawer">
        <div className="cart-drawer-header">
          <h3>Your Cart / Order</h3>
          <button type="button" className="cart-drawer-close" onClick={() => setIsCartPanelOpen(false)}>
            Close
          </button>
        </div>

        <div className="drawer-view-switch">
          <button
            type="button"
            className={`drawer-view-btn${showOrderHistory ? '' : ' active'}`}
            onClick={() => setShowOrderHistory(false)}
          >
            Current Order
          </button>
          <button
            type="button"
            className={`drawer-view-btn${showOrderHistory ? ' active' : ''}`}
            onClick={() => setShowOrderHistory(true)}
          >
            History
          </button>
        </div>

        {showOrderHistory ? (
          <div className="order-history-list">
            {emailOrderHistory.length === 0 ? (
              <p className="cart-empty">No order history for this email yet.</p>
            ) : (
              emailOrderHistory.map((order) => (
                <article key={order.orderId} className="history-card">
                  <p><strong>Order ID:</strong> {order.orderId}</p>
                  <p><strong>Status:</strong> {order.status}</p>
                  <p><strong>Placed:</strong> {order.placedAt}</p>
                  <div className="history-items">
                    {order.items.map((item, itemIndex) => (
                      <p key={`${order.orderId}-${itemIndex}`}>
                        {item.name} - {item.quantityKey.toUpperCase()} x {item.count} = {formatRupees(item.lineTotal)}
                      </p>
                    ))}
                  </div>
                  <p><strong>Total:</strong> {formatRupees(order.total)}</p>
                </article>
              ))
            )}
          </div>
        ) : (
          <>
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
              disabled={cartItems.length === 0}
            >
              Place Order
            </button>

            {orderStatus !== 'idle' && orderMeta ? (
              <div className="delivery-box" aria-live="polite">
                <p className="delivery-title">Delivery Update</p>
                <p><strong>Order ID:</strong> {orderMeta.orderId}</p>
                <p><strong>Customer:</strong> {orderMeta.customerName}</p>
                <p><strong>User ID:</strong> {loggedInUser.userId}</p>
                <p><strong>Email:</strong> {orderMeta.customerEmail}</p>
                <p><strong>Placed At:</strong> {orderMeta.placedAt}</p>
                <p><strong>Delivery Address:</strong> {deliveryAddress}</p>
                <p><strong>Order Status:</strong> {orderStatusLabel}</p>

                <div className="delivery-items">
                  <strong>Items:</strong>
                  {cartItems.map((item) => (
                    <p key={`delivery-${item.cartKey}`}>
                      {item.name} - {item.quantityKey.toUpperCase()} x {item.count} = {formatRupees(item.lineTotal)}
                    </p>
                  ))}
                </div>

                <div className="delivery-total-line">
                  <p>Subtotal: {formatRupees(cartSubtotal)}</p>
                  <p>Discount: - {formatRupees(discountAmount)}</p>
                  <p><strong>Payable Total: {formatRupees(finalTotal)}</strong></p>
                </div>

                <div className="order-flow">
                  <p className="order-success">Order confirmed successfully ✅</p>
                  <p className={orderStatus === 'ordered' ? 'flow-step active' : 'flow-step'}>Ordered</p>
                  <p className={orderStatus === 'out-for-delivery' ? 'flow-step active' : 'flow-step'}>Out for Delivery</p>
                  <p className={orderStatus === 'delivered' ? 'flow-step active' : 'flow-step'}>Delivered</p>
                </div>
              </div>
            ) : null}
          </>
        )}
      </aside>

      {isCartPanelOpen ? <button type="button" className="cart-backdrop" onClick={() => setIsCartPanelOpen(false)} aria-label="Close order drawer" /> : null}

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
              <button type="button" className="link-button footer-link-button" onClick={openHistoryPanel}>
                History
              </button>
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