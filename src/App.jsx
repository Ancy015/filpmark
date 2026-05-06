import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import Home from './Home';
import Contact from './Contact';

const PRODUCTS_TABLE = 'product';
const ORDERS_TABLE = 'orders';
const SORT_OPTIONS = ['default', 'price-asc', 'price-desc', 'name-asc'];
const WISHLIST_TABLE = 'wishlist';
const HISTORY_TABLE = 'history';
const LOCAL_AUTH_KEY = 'flipmark-local-auth';
const STORAGE_PREFIX = 'flipmark-state';
const ORDER_STAGES = ['Confirmed', 'Packed', 'Out for delivery', 'Delivered'];
const PROMO_CODES = {
  SAVE10: { type: 'percent', value: 10, label: '10% off' },
  WELCOME5: { type: 'flat', value: 5, label: '₹5 off' },
  FREESHIP: { type: 'flat', value: 40, label: 'Delivery fee waived' },
};
const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="svghttp://www.w3.org/2000/" viewBox="0 0 640 480" role="img" aria-label="No image available">
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

function safeParseJSON(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getUserStorageKey(authUser) {
  if (!authUser) {
    return `${STORAGE_PREFIX}:guest`;
  }

  return `${STORAGE_PREFIX}:${authUser.id || authUser.email || 'guest'}`;
}

function readUserState(authUser) {
  if (typeof window === 'undefined') {
    return null;
  }

  const storageKey = getUserStorageKey(authUser);
  return safeParseJSON(window.localStorage.getItem(storageKey), null);
}

function writeUserState(authUser, value) {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getUserStorageKey(authUser);
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function readLocalAuthUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  return safeParseJSON(window.localStorage.getItem(LOCAL_AUTH_KEY), null);
}

function writeLocalAuthUser(user) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(LOCAL_AUTH_KEY);
    return;
  }

  window.localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
}

function createOrderId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getOrderStage(createdAt) {
  const age = Date.now() - createdAt;

  if (age < 15 * 1000) {
    return ORDER_STAGES[0];
  }

  if (age < 30 * 1000) {
    return ORDER_STAGES[1];
  }

  if (age < 45 * 1000) {
    return ORDER_STAGES[2];
  }

  return ORDER_STAGES[3];
}

function formatCurrencyAmount(value) {
  const numericValue = Number(value || 0);
  return `₹${numericValue.toLocaleString('en-IN')}`;
}

function buildLineItems(cartEntries, formatPrice) {
  return cartEntries.map(({ product, quantity }) => ({
    id: product.id,
    name: product.name || 'Unnamed product',
    category: product.category || 'Uncategorized',
    quantity,
    price: Number(product.price || 0),
    formattedPrice: formatPrice(product.price),
  }));
}

function getUserIdentifier(authUser) {
  return authUser?.id || authUser?.email || '';
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getSupabaseUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !isUuid(data?.user?.id)) {
    return '';
  }

  return data.user.id;
}

function buildHistoryOrders(rows, productById) {
  const groupedOrders = new Map();

  rows.forEach((row) => {
    const rawDate = row.date || row.created_at || new Date().toISOString();
    const parsedDate = new Date(rawDate);
    const createdAt = Number.isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
    const orderKey = String(rawDate);

    if (!groupedOrders.has(orderKey)) {
      groupedOrders.set(orderKey, {
        id: `history-${orderKey}`,
        trackingCode: `FM-${String(createdAt).slice(-6).toUpperCase()}`,
        createdAt,
        items: [],
        subtotal: 0,
        total: 0,
        paymentMethod: 'Saved purchase',
      });
    }

    const order = groupedOrders.get(orderKey);
    const product = productById.get(String(row.product_id));
    const quantity = Number(row.quantity || 1);
    const price = Number(product?.price || 0);

    order.items.push({
      id: String(row.product_id),
      name: product?.name || `Product #${row.product_id}`,
      category: product?.category || 'Uncategorized',
      quantity,
      price,
      formattedPrice: formatPrice(price),
    });
    order.subtotal += price * quantity;
    order.total = order.subtotal;
  });

  return Array.from(groupedOrders.values()).sort((left, right) => right.createdAt - left.createdAt);
}

function App() {
  const [activePage, setActivePage] = useState('home');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortMode, setSortMode] = useState('default');
  const [viewMode, setViewMode] = useState('grid');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [cartItems, setCartItems] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState({});
  const [orders, setOrders] = useState([]);
  const [drawerView, setDrawerView] = useState('cart');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [remoteDataHydratedKey, setRemoteDataHydratedKey] = useState('');
  const cartPreviewTimerRef = useRef(null);
  const snackbarTimerRef = useRef(null);
  const orderTimersRef = useRef([]);
  const hydratedStorageKeyRef = useRef('');
  const lastWishlistSyncSignatureRef = useRef('');

  const pushSnackbar = (message) => {
    setSnackbar(message);

    if (snackbarTimerRef.current) {
      window.clearTimeout(snackbarTimerRef.current);
    }

    snackbarTimerRef.current = window.setTimeout(() => {
      setSnackbar('');
    }, 2500);
  };

  const notifyUser = (title, body) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (notificationEnabled && 'Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(title, { body });
    }
  };

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

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const localUser = readLocalAuthUser();

      if (localUser && !isUuid(localUser.id)) {
        writeLocalAuthUser(null);
      }

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (sessionError) {
          console.warn('Supabase session lookup failed:', sessionError);
        }

        if (data?.session?.user) {
          setAuthUser(data.session.user);
        } else if (localUser && isUuid(localUser.id)) {
          setAuthUser(localUser);
        }
      } catch (authLookupError) {
        if (localUser && isUuid(localUser.id)) {
          setAuthUser(localUser);
        }
        console.warn('Auth bootstrap fell back to local session:', authLookupError);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    bootstrapAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        writeLocalAuthUser(session.user);
        setAuthOpen(false);
        pushSnackbar(`Signed in as ${session.user.email || 'user'}`);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const authStorageKey = getUserStorageKey(authUser);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const stored = readUserState(authUser) || {};
    setCartItems(stored.cartItems || {});
    setWishlistItems(stored.wishlistItems || {});
    setOrders(Array.isArray(stored.orders) ? stored.orders : []);
    setAppliedPromoCode(stored.appliedPromoCode || '');
    setPromoCodeInput(stored.appliedPromoCode || '');
    hydratedStorageKeyRef.current = authStorageKey;
  }, [authReady, authStorageKey, authUser]);

  useEffect(() => {
    if (!authReady || hydratedStorageKeyRef.current !== authStorageKey) {
      return;
    }

    writeUserState(authUser, {
      cartItems,
      wishlistItems,
      orders,
      appliedPromoCode,
    });
  }, [appliedPromoCode, authReady, authStorageKey, authUser, cartItems, orders, wishlistItems]);

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        window.clearTimeout(snackbarTimerRef.current);
      }

      if (cartPreviewTimerRef.current) {
        window.clearTimeout(cartPreviewTimerRef.current);
      }

      orderTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
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
    const minPriceValue = minPrice === '' ? null : Number(minPrice);
    const maxPriceValue = maxPrice === '' ? null : Number(maxPrice);

    let nextProducts = products.filter((product) => {
      const matchesCategory =
        activeCategory === 'All' || (product.category || '').trim().toLowerCase() === normalizedCategory;
      const searchableText = `${product.name || ''} ${product.category || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const priceValue = Number(product.price || 0);
      const matchesMinPrice = minPriceValue === null || Number.isNaN(minPriceValue) || priceValue >= minPriceValue;
      const matchesMaxPrice = maxPriceValue === null || Number.isNaN(maxPriceValue) || priceValue <= maxPriceValue;

      return matchesCategory && matchesSearch && matchesMinPrice && matchesMaxPrice;
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
  }, [activeCategory, maxPrice, minPrice, products, searchTerm, sortMode]);

  const categoryImages = useMemo(() => {
    const nextImages = new Map();

    for (const product of products) {
      const categoryName = (product.category || '').trim();

      if (categoryName && !nextImages.has(categoryName)) {
        nextImages.set(categoryName, product.imageUrl || FALLBACK_IMAGE);
      }
    }

    return nextImages;
  }, [products]);

  const getCategoryImage = (categoryName) => {
    if (categoryName === 'All') {
      return trendingProducts[0]?.imageUrl || FALLBACK_IMAGE;
    }

    return categoryImages.get(categoryName) || FALLBACK_IMAGE;
  };

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

  const productById = useMemo(() => {
    return new Map(products.map((product) => [String(product.id), product]));
  }, [products]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let isMounted = true;

    const loadRemoteUserData = async () => {
      try {
        const userId = await getSupabaseUserId();

        if (!userId) {
          if (isMounted) {
            setRemoteDataHydratedKey('');
            lastWishlistSyncSignatureRef.current = '';
          }
          return;
        }

        const [wishlistResponse, historyResponse] = await Promise.all([
          supabase.from(WISHLIST_TABLE).select('product_id').eq('user_id', userId),
          supabase.from(HISTORY_TABLE).select('product_id, quantity, date').eq('user_id', userId).order('date', { ascending: false }),
        ]);

        if (!isMounted) {
          return;
        }

        if (!wishlistResponse.error && Array.isArray(wishlistResponse.data)) {
          const nextWishlistItems = {};

          wishlistResponse.data.forEach((row) => {
            if (row?.product_id !== undefined && row?.product_id !== null) {
              nextWishlistItems[row.product_id] = true;
            }
          });

          if (Object.keys(nextWishlistItems).length > 0) {
            setWishlistItems(nextWishlistItems);
          }

          lastWishlistSyncSignatureRef.current = Object.keys(nextWishlistItems).sort().join('|');
        }

        if (!historyResponse.error && Array.isArray(historyResponse.data) && historyResponse.data.length > 0) {
          setOrders(buildHistoryOrders(historyResponse.data, productById));
        }
      } catch (remoteLoadError) {
        console.warn('Remote user data load failed:', remoteLoadError);
      } finally {
        if (isMounted) {
          setRemoteDataHydratedKey(authStorageKey);
        }
      }
    };

    loadRemoteUserData();

    return () => {
      isMounted = false;
    };
  }, [authReady, authStorageKey, authUser, productById]);

  const wishlistSyncSignature = useMemo(() => Object.keys(wishlistItems).sort().join('|'), [wishlistItems]);

  useEffect(() => {
    if (!authReady || !authUser || remoteDataHydratedKey !== authStorageKey) {
      return;
    }

    if (wishlistSyncSignature === lastWishlistSyncSignatureRef.current) {
      return;
    }

    const syncWishlist = async () => {
      try {
        const userId = await getSupabaseUserId();

        if (!userId) {
          return;
        }

        const wishlistRows = Object.keys(wishlistItems).map((productId) => ({
          user_id: userId,
          product_id: productId,
        }));

        const deleteResponse = await supabase.from(WISHLIST_TABLE).delete().eq('user_id', userId);

        if (deleteResponse.error) {
          throw deleteResponse.error;
        }

        if (wishlistRows.length > 0) {
          const insertResponse = await supabase.from(WISHLIST_TABLE).insert(wishlistRows);

          if (insertResponse.error) {
            throw insertResponse.error;
          }
        }

        lastWishlistSyncSignatureRef.current = wishlistSyncSignature;
      } catch (wishlistSyncError) {
        console.warn('Wishlist sync failed:', wishlistSyncError);
      }
    };

    syncWishlist();
  }, [authReady, authStorageKey, authUser, remoteDataHydratedKey, wishlistItems, wishlistSyncSignature]);

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
    setCartOpen(true);
    setCartPreviewOpen(true);
    setDrawerView('cart');
    pushSnackbar('Added to cart');
    notifyUser('FlipMark cart updated', 'An item was added to your cart.');
  };

  const handleDecreaseCart = (productId) => {
    setCartItems((previous) => {
      const currentQuantity = previous[productId] || 0;

      if (currentQuantity <= 1) {
        const nextCart = { ...previous };
        delete nextCart[productId];
        return nextCart;
      }

      return {
        ...previous,
        [productId]: currentQuantity - 1,
      };
    });
    pushSnackbar('Cart quantity updated');
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems((previous) => {
      const nextCart = { ...previous };
      delete nextCart[productId];
      return nextCart;
    });
    pushSnackbar('Removed from cart');
  };

  const toggleWishlist = (productId) => {
    setWishlistItems((previous) => {
      const nextWishlist = { ...previous };

      if (nextWishlist[productId]) {
        delete nextWishlist[productId];
        pushSnackbar('Removed from wishlist');
      } else {
        nextWishlist[productId] = true;
        pushSnackbar('Saved for later');
      }

      return nextWishlist;
    });
  };

  const getWishlistCount = (productId) => (wishlistItems[productId] ? 1 : 0);

  const getCartCount = (productId) => cartItems[productId] || 0;

  const cartEntries = useMemo(() => {
    return Object.entries(cartItems)
      .map(([productId, quantity]) => {
        const product = products.find((item) => String(item.id) === String(productId));

        if (!product) {
          return null;
        }

        return {
          product,
          quantity,
        };
      })
      .filter(Boolean);
  }, [cartItems, products]);

  const cartItemCount = cartEntries.reduce((total, entry) => total + entry.quantity, 0);

  const cartTotal = cartEntries.reduce((total, entry) => {
    return total + Number(entry.product.price || 0) * entry.quantity;
  }, 0);

  const cartPreviewEntries = cartEntries.slice(0, 3);

  const wishlistEntries = useMemo(() => {
    return Object.keys(wishlistItems)
      .map((productId) => productById.get(String(productId)))
      .filter(Boolean);
  }, [productById, wishlistItems]);

  const discountInfo = PROMO_CODES[appliedPromoCode.toUpperCase()] || null;
  const discountAmount = useMemo(() => {
    if (!discountInfo) {
      return 0;
    }

    if (discountInfo.type === 'percent') {
      return Math.round((cartTotal * discountInfo.value) / 100);
    }

    return Math.min(cartTotal, discountInfo.value);
  }, [cartTotal, discountInfo]);

  const payableTotal = Math.max(0, cartTotal - discountAmount);

  const accountLabel = authUser?.user_metadata?.full_name || authUser?.email || 'Guest';

  const openAuthModal = () => {
    setAuthMode(authUser ? 'login' : 'signup');
    setAuthOpen(true);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');

    const email = authForm.email.trim();
    const password = authForm.password;
    const name = authForm.name.trim();

    try {
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }

      if (authMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || email.split('@')[0] } },
        });

        if (signUpError) {
          throw signUpError;
        }

        const nextUser = data?.user || data?.session?.user;
        if (nextUser) {
          setAuthUser(nextUser);
          writeLocalAuthUser(nextUser);
        } else {
          const localUser = { id: crypto.randomUUID(), email, user_metadata: { full_name: name || email.split('@')[0] } };
          setAuthUser(localUser);
          writeLocalAuthUser(localUser);
        }

        pushSnackbar('Account created');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        const nextUser = data?.user || data?.session?.user;
        if (nextUser) {
          setAuthUser(nextUser);
          writeLocalAuthUser(nextUser);
        } else {
          const localUser = { id: crypto.randomUUID(), email, user_metadata: { full_name: name || email.split('@')[0] } };
          setAuthUser(localUser);
          writeLocalAuthUser(localUser);
        }

        pushSnackbar('Signed in successfully');
      }

      setAuthOpen(false);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (authSubmitError) {
      const fallbackUser = {
        id: crypto.randomUUID(),
        email: email || 'guest@flipmark.local',
        user_metadata: { full_name: name || (email ? email.split('@')[0] : 'Guest') },
      };

      console.warn('Auth flow fell back to local session:', authSubmitError);
      setAuthError(authSubmitError?.message || 'Using a local demo session for this account.');
      setAuthUser(fallbackUser);
      writeLocalAuthUser(fallbackUser);
      setAuthOpen(false);
      setAuthForm({ name: '', email: '', password: '' });
      pushSnackbar(authMode === 'signup' ? 'Created local demo account' : 'Opened local demo session');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.warn('Supabase sign out failed:', signOutError);
    }

    writeLocalAuthUser(null);
    setAuthUser(null);
    setAuthOpen(false);
    setCartItems({});
    setWishlistItems({});
    setOrders([]);
    setAppliedPromoCode('');
    setPromoCodeInput('');
    pushSnackbar('Signed out');
  };

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      pushSnackbar('Notifications are not supported in this browser');
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationEnabled(permission === 'granted');
    pushSnackbar(permission === 'granted' ? 'Notifications enabled' : 'Notifications blocked');
  };

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();

    if (!code) {
      setAppliedPromoCode('');
      pushSnackbar('Promo cleared');
      return;
    }

    if (!PROMO_CODES[code]) {
      pushSnackbar('Invalid promo code');
      return;
    }

    setAppliedPromoCode(code);
    pushSnackbar(`Applied ${code}`);
  };

  const scheduleOrderStatusUpdates = (orderId) => {
    const stagedUpdates = [
      { delay: 15000, status: 'Packed' },
      { delay: 30000, status: 'Out for delivery' },
      { delay: 45000, status: 'Delivered' },
    ];

    stagedUpdates.forEach(({ delay, status }) => {
      const timerId = window.setTimeout(() => {
        setOrders((previousOrders) =>
          previousOrders.map((order) => {
            if (order.id !== orderId) {
              return order;
            }

            const nextOrder = { ...order, status };
            notifyUser('Order update', `${order.trackingCode} is now ${status}.`);
            return nextOrder;
          }),
        );
      }, delay);

      orderTimersRef.current.push(timerId);
    });
  };

  const placeOrder = async (product) => {
    if (!product?.id) {
      return;
    }

    const userId = await getSupabaseUserId();

    if (!userId) {
      alert('Please login first');
      return;
    }

    const orderCreatedAt = Date.now();
    const order = {
      id: createOrderId(),
      trackingCode: `FM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      createdAt: orderCreatedAt,
      items: [
        {
          id: String(product.id),
          name: product.name || 'Unnamed product',
          category: product.category || 'Uncategorized',
          quantity: 1,
          price: Number(product.price || 0),
          formattedPrice: formatPrice(product.price),
        },
      ],
      subtotal: Number(product.price || 0),
      discountAmount: 0,
      total: Number(product.price || 0),
      paymentMethod: 'Direct order',
      status: 'Confirmed',
      customer: accountLabel,
    };

    const { error: insertError } = await supabase.from(ORDERS_TABLE).insert([
      {
        user_id: userId,
        product_id: product.id,
        quantity: 1,
        created_at: new Date(orderCreatedAt).toISOString(),
      },
    ]);

    if (insertError) {
      console.error('Failed to insert order:', insertError);
      alert(insertError.message || 'Unable to place order');
      return;
    }

    setOrders((previousOrders) => [order, ...previousOrders]);
    setDrawerView('orders');
    setCartOpen(true);
    pushSnackbar('Order placed successfully');
    notifyUser('Order placed', `${order.trackingCode} has been confirmed.`);
    scheduleOrderStatusUpdates(order.id);
    alert('Order placed successfully');
  };

  const handleCheckout = async (paymentMethod) => {
    if (cartEntries.length === 0) {
      pushSnackbar('Your cart is empty');
      return;
    }

    // Prevent unauthenticated users from placing orders
    if (!authUser) {
      pushSnackbar('Please sign in before placing an order');
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }

    const order = {
      id: createOrderId(),
      trackingCode: `FM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      createdAt: Date.now(),
      items: buildLineItems(cartEntries, formatPrice),
      subtotal: cartTotal,
      discountAmount,
      total: payableTotal,
      paymentMethod,
      status: 'Confirmed',
      customer: accountLabel,
    };

    setOrders((previousOrders) => [order, ...previousOrders]);
    setCartItems({});
    setAppliedPromoCode('');
    setPromoCodeInput('');
    setDrawerView('orders');
    setCartOpen(true);
    pushSnackbar(`${paymentMethod} checkout completed`);
    notifyUser('Order placed', `${order.trackingCode} has been confirmed.`);

    const userId = await getSupabaseUserId();

    if (userId) {
      const historyRows = cartEntries.map(({ product, quantity }) => ({
        user_id: userId,
        product_id: String(product.id),
        quantity,
        date: new Date(order.createdAt).toISOString(),
      }));

      supabase.from(HISTORY_TABLE).insert(historyRows).then(({ error: historyError }) => {
        if (historyError) {
          console.warn('History sync failed:', historyError);
        }
      });
    }

    scheduleOrderStatusUpdates(order.id);
  };

  const handleStripeCheckout = () => handleCheckout('Stripe');
  const handleRazorpayCheckout = () => handleCheckout('Razorpay');

  const cartPreviewLabel = cartItemCount > 0 ? `${cartItemCount} item${cartItemCount === 1 ? '' : 's'}` : 'Cart empty';

  if (activePage === 'contact') {
    return <Contact onNavigateHome={() => setActivePage('home')} />;
  }

  return (
    <div className="page-shell">
      <Home
        categories={categories}
        trendingProducts={trendingProducts}
        products={products}
        onJumpToProducts={handleCategoryJump}
        onNavigateContact={() => setActivePage('contact')}
        fallbackImage={FALLBACK_IMAGE}
        formatPrice={formatPrice}
        getCategoryImage={getCategoryImage}
        cartItemCount={cartItemCount}
        cartPreviewEntries={cartPreviewEntries}
        cartPreviewLabel={cartPreviewLabel}
        cartPreviewOpen={cartPreviewOpen}
        setCartPreviewOpen={setCartPreviewOpen}
        onOpenAuth={openAuthModal}
        onCartToggle={() => setCartOpen(true)}
        currentUserLabel={accountLabel}
        isAuthenticated={Boolean(authUser)}
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
                    <div className="product-card-actions">
                      <button
                        type="button"
                        className="wishlist-toggle-btn"
                        aria-pressed={getWishlistCount(product.id) > 0}
                        onClick={() => toggleWishlist(product.id)}
                      >
                        {getWishlistCount(product.id) > 0 ? 'Saved' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="primary-cta small-cta"
                        onClick={() => placeOrder(product)}
                      >
                        Order
                      </button>
                    </div>
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
                  <img src={getCategoryImage(categoryName)} alt={categoryName} />
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
              <button
                type="button"
                className="cart-drawer-toggle"
                onClick={() => {
                  setCartOpen(true);
                  setDrawerView('cart');
                }}
                onMouseEnter={() => setCartPreviewOpen(true)}
                onMouseLeave={() => {
                  if (cartPreviewTimerRef.current) {
                    window.clearTimeout(cartPreviewTimerRef.current);
                  }

                  cartPreviewTimerRef.current = window.setTimeout(() => setCartPreviewOpen(false), 140);
                }}
              >
                Cart ({cartItemCount})
              </button>
              {cartPreviewOpen ? (
                <div className="cart-preview-dropdown" role="dialog" aria-label="Cart preview">
                  <div className="cart-preview-head">
                    <strong>{cartPreviewLabel}</strong>
                    <button type="button" className="link-button" onClick={() => setCartOpen(true)}>
                      View cart
                    </button>
                  </div>
                  {cartPreviewEntries.length === 0 ? (
                    <p className="cart-preview-empty">Your cart is empty. Add something to continue.</p>
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
                  <button
                    type="button"
                    className="primary-cta small-cta"
                    disabled={cartPreviewEntries.length === 0}
                    onClick={() => {
                      setDrawerView('checkout');
                      setCartOpen(true);
                    }}
                  >
                    Checkout
                  </button>
                </div>
              ) : null}
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

              <input
                className="price-filter-input"
                type="number"
                min="0"
                placeholder="Min price"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
              <input
                className="price-filter-input"
                type="number"
                min="0"
                placeholder="Max price"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />

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
                  <button
                    type="button"
                    className={`wishlist-heart${getWishlistCount(product.id) > 0 ? ' active' : ''}`}
                    aria-label={getWishlistCount(product.id) > 0 ? 'Remove from wishlist' : 'Save for later'}
                    aria-pressed={getWishlistCount(product.id) > 0}
                    onClick={() => toggleWishlist(product.id)}
                  >
                    ♥
                  </button>
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
                    <div className="product-card-actions">
                      <div className="qty-inline">
                        <button type="button" className="remove-cart-btn" onClick={() => handleDecreaseCart(product.id)}>
                          -
                        </button>
                        <strong>{getCartCount(product.id) || 0}</strong>
                        <button type="button" className="add-cart-btn" onClick={() => handleAddToCart(product.id)}>
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="primary-cta small-cta"
                        onClick={() => placeOrder(product)}
                      >
                        Order
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {cartOpen ? (
        <button
          type="button"
          className="cart-backdrop"
          aria-label="Close cart drawer"
          onClick={() => setCartOpen(false)}
        />
      ) : null}

      <aside className={`cart-drawer${cartOpen ? ' open' : ''}`} aria-label="Shopping cart" aria-hidden={!cartOpen}>
        <div className="cart-drawer-header">
          <div>
            <h3>Shopping Center</h3>
            <p>{cartItemCount} item{cartItemCount === 1 ? '' : 's'}</p>
          </div>
          <button type="button" className="cart-drawer-close" onClick={() => setCartOpen(false)}>
            Close
          </button>
        </div>

        <div className="drawer-view-switch">
          <button type="button" className={`drawer-view-btn${drawerView === 'cart' ? ' active' : ''}`} onClick={() => setDrawerView('cart')}>
            Cart
          </button>
          <button type="button" className={`drawer-view-btn${drawerView === 'wishlist' ? ' active' : ''}`} onClick={() => setDrawerView('wishlist')}>
            Wishlist
          </button>
          <button type="button" className={`drawer-view-btn${drawerView === 'orders' ? ' active' : ''}`} onClick={() => setDrawerView('orders')}>
            Orders
          </button>
          <button type="button" className={`drawer-view-btn${drawerView === 'checkout' ? ' active' : ''}`} onClick={() => setDrawerView('checkout')}>
            Checkout
          </button>
        </div>

        {drawerView === 'cart' ? (
          <>
            <div className="cart-items-list">
              {cartEntries.length === 0 ? (
                <div className="empty-state cart-empty-state">
                  <p className="cart-empty">Your cart is empty.</p>
                  <p>Browse products and use the add button to build your cart.</p>
                  <button type="button" className="primary-cta small-cta" onClick={() => setCartOpen(false)}>
                    Continue shopping
                  </button>
                </div>
              ) : (
                cartEntries.map(({ product, quantity }) => (
                  <article className="cart-item-row" key={product.id}>
                    <div>
                      <strong>{product.name || 'Unnamed product'}</strong>
                      <p>
                        {product.category || 'Uncategorized'} · {formatPrice(product.price)} each
                      </p>
                    </div>

                    <div className="cart-item-right">
                      <button type="button" className="remove-cart-btn" onClick={() => handleDecreaseCart(product.id)}>
                        -
                      </button>
                      <strong>{quantity}</strong>
                      <button type="button" className="add-cart-btn" onClick={() => handleAddToCart(product.id)}>
                        +
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="cart-total-box">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <button type="button" className="place-order-btn" onClick={() => setDrawerView('checkout')} disabled={cartEntries.length === 0}>
                Go to checkout
              </button>
            </div>
          </>
        ) : null}

        {drawerView === 'wishlist' ? (
          <>
            <div className="cart-items-list">
              {wishlistEntries.length === 0 ? (
                <div className="empty-state cart-empty-state">
                  <p className="cart-empty">No saved items yet.</p>
                  <p>Use the heart button on a product to save it for later.</p>
                </div>
              ) : (
                wishlistEntries.map((product) => (
                  <article className="cart-item-row" key={product.id}>
                    <div>
                      <strong>{product.name || 'Unnamed product'}</strong>
                      <p>{product.category || 'Uncategorized'} · {formatPrice(product.price)}</p>
                    </div>
                    <div className="cart-item-right">
                      <button type="button" className="remove-cart-btn" onClick={() => toggleWishlist(product.id)}>
                        Remove
                      </button>
                      <button type="button" className="add-cart-btn" onClick={() => handleAddToCart(product.id)}>
                        Add
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        ) : null}

        {drawerView === 'orders' ? (
          <div className="order-history-list">
            {orders.length === 0 ? (
              <div className="empty-state cart-empty-state">
                <p className="cart-empty">No orders yet.</p>
                <p>Complete checkout to track deliveries here.</p>
              </div>
            ) : (
              orders.map((order) => (
                <article className="history-card order-card" key={order.id}>
                  <div className="cart-summary-row">
                    <span>{order.trackingCode}</span>
                    <strong>{getOrderStage(order.createdAt)}</strong>
                  </div>
                  <p>{order.items.length} item{order.items.length === 1 ? '' : 's'} • {order.paymentMethod}</p>
                  <div className="history-items">
                    {order.items.map((item) => (
                      <p key={item.id}>
                        {item.name} x{item.quantity}
                      </p>
                    ))}
                  </div>
                  <p className="delivery-total-line">Total: {formatPrice(order.total)}</p>
                </article>
              ))
            )}
          </div>
        ) : null}

        {drawerView === 'checkout' ? (
          <div className="order-flow">
            <div className="delivery-box">
              <p className="delivery-title">Checkout summary</p>
              <p>Subtotal: {formatPrice(cartTotal)}</p>
              <p>Discount: {formatPrice(discountAmount)}</p>
              <p className="delivery-total-line">Payable: {formatPrice(payableTotal)}</p>
            </div>

            <div className="promo-row">
              <input
                type="text"
                className="promo-input"
                placeholder="Promo code"
                value={promoCodeInput}
                onChange={(event) => setPromoCodeInput(event.target.value)}
              />
              <button type="button" className="filter-chip" onClick={handleApplyPromo}>
                Apply
              </button>
            </div>

            <div className="checkout-actions">
              <button type="button" className="place-order-btn" onClick={handleRazorpayCheckout} disabled={cartEntries.length === 0}>
                Pay with Razorpay
              </button>
              <button type="button" className="place-order-btn" onClick={handleStripeCheckout} disabled={cartEntries.length === 0}>
                Pay with Stripe
              </button>
            </div>

            <button type="button" className="remove-cart-btn checkout-secondary" onClick={handleEnableNotifications}>
              Enable notifications
            </button>
          </div>
        ) : null}
      </aside>

      {authOpen ? (
        <div className="auth-modal-backdrop" role="presentation" onClick={() => setAuthOpen(false)}>
          <section className="auth-page-shell auth-modal" role="dialog" aria-modal="true" aria-label="Account access" onClick={(event) => event.stopPropagation()}>
            <div className="auth-page-card">
              <h1>{authMode === 'login' ? 'Sign in' : 'Create account'}</h1>
              <p>Use one account so your cart, wishlist, and orders stay together on this device.</p>

              <div className="auth-mode-switch">
                <button type="button" className={`auth-mode-btn${authMode === 'login' ? ' active' : ''}`} onClick={() => setAuthMode('login')}>
                  Login
                </button>
                <button type="button" className={`auth-mode-btn${authMode === 'signup' ? ' active' : ''}`} onClick={() => setAuthMode('signup')}>
                  Signup
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === 'signup' ? (
                  <input
                    type="text"
                    placeholder="Full name"
                    value={authForm.name}
                    onChange={(event) => setAuthForm((previous) => ({ ...previous, name: event.target.value }))}
                  />
                ) : null}
                <input
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((previous) => ({ ...previous, email: event.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((previous) => ({ ...previous, password: event.target.value }))}
                />

                <button type="submit" className="auth-submit-btn" disabled={authBusy}>
                  {authBusy ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Signup'}
                </button>
              </form>

              {authError ? <p className="auth-message auth-error">{authError}</p> : null}
              <div className="auth-message auth-account-actions">
                <span>{authUser ? `Signed in as ${accountLabel}` : 'No account active.'}</span>
                {authUser ? (
                  <button type="button" className="link-button auth-link" onClick={handleLogout}>
                    Logout
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {snackbar ? <div className="snackbar">{snackbar}</div> : null}
    </div>
  );
}

export default App;
