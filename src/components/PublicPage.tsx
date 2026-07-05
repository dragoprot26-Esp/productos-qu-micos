import React, { useState, useMemo, useEffect } from 'react';
import { Tenant, Product, Order, OrderItem, AppNotification } from '../types';
import { THEME_PRESETS, FONT_PRESETS } from '../data';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  MapPin, 
  Truck, 
  Sparkles, 
  Copy, 
  Check, 
  X, 
  Phone, 
  User, 
  ArrowRight,
  Heart,
  Share2,
  Mail,
  Shield
} from 'lucide-react';

interface PublicPageProps {
  tenant: Tenant;
  products: Product[];
  onPlaceOrder: (order: Omit<Order, 'id' | 'code' | 'createdAt'>) => string; // Returns the generated code
  notifications: AppNotification[];
  onMarkNotificationsRead: () => void;
  onGoToAdmin?: () => void;
}

export default function PublicPage({
  tenant,
  products,
  onPlaceOrder,
  notifications,
  onMarkNotificationsRead,
  onGoToAdmin
}: PublicPageProps) {
  // Computed Map link with fallback to automatic local search
  const mapLink = tenant.customization.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(tenant.name + ' Argentina')}`;

  // Cart state: productId -> quantity
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  
  // Force pickup if delivery is not allowed by the admin
  useEffect(() => {
    if (!tenant.allowDelivery) {
      setDeliveryType('pickup');
    }
  }, [tenant.allowDelivery]);
  
  // Order Success Modal State
  const [successOrderCode, setSuccessOrderCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Share dropdown state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);

  // Filter products for this specific tenant
  const tenantProducts = useMemo(() => {
    return products.filter(p => p.tenantId === tenant.id);
  }, [products, tenant.id]);

  // Extract unique categories for this tenant's products.
  // "Todos" y (si hay ofertas) "🔥 Ofertas" van primero, como pestañas.
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tenantProducts.forEach(p => cats.add(p.category));
    const base = ['Todos'];
    if (tenantProducts.some(p => p.isPromo)) base.push('🔥 Ofertas');
    return [...base, ...Array.from(cats)];
  }, [tenantProducts]);

  // Filter products by selected category (con pestaña especial de ofertas)
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return tenantProducts;
    if (selectedCategory === '🔥 Ofertas') return tenantProducts.filter(p => p.isPromo);
    return tenantProducts.filter(p => p.category === selectedCategory);
  }, [tenantProducts, selectedCategory]);

  // Separate promo products
  const promoProducts = useMemo(() => {
    return tenantProducts.filter(p => p.isPromo);
  }, [tenantProducts]);

  // Custom theme styling from presets
  const themeStyles = THEME_PRESETS[tenant.customization.theme] || THEME_PRESETS['eco-green'];
  const fontClass = FONT_PRESETS[tenant.customization.fontFamily] || FONT_PRESETS['font-sans'];

  // Calculate cart items & totals
  const cartItems = useMemo(() => {
    const items: Array<{ product: Product; quantity: number; itemTotal: number }> = [];
    Object.keys(cart).forEach((productId) => {
      const qty = cart[productId] || 0;
      if (qty <= 0) return;
      const product = products.find(p => p.id === productId);
      if (product) {
        const activePrice = product.isPromo && product.promoPrice ? product.promoPrice : product.price;
        items.push({
          product,
          quantity: qty,
          itemTotal: activePrice * qty
        });
      }
    });
    return items;
  }, [cart, products]);

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cartItems]);

  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.itemTotal, 0);
  }, [cartItems]);

  // Notification count for this tenant
  const tenantNotifications = useMemo(() => {
    return notifications.filter(n => n.tenantId === tenant.id);
  }, [notifications, tenant.id]);

  const unreadNotifCount = useMemo(() => {
    return tenantNotifications.filter(n => !n.isRead).length;
  }, [tenantNotifications]);

  // Add/remove item helpers
  const handleUpdateQty = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      // Stock warning block
      if (delta > 0 && newQty > product.stock) {
        alert(`Disculpe, solo disponemos de ${product.stock} unidades de este producto.`);
        return prev;
      }

      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[productId];
      } else {
        updated[productId] = newQty;
      }
      return updated;
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  // Submit Order Action
  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor complete su nombre y teléfono para finalizar.');
      return;
    }

    const orderItems: OrderItem[] = cartItems.map(item => {
      const activePrice = item.product.isPromo && item.product.promoPrice 
        ? item.product.promoPrice 
        : item.product.price;
      return {
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: activePrice
      };
    });

    // Invoke callback to place order in parent state
    const code = onPlaceOrder({
      tenantId: tenant.id,
      customerName,
      customerPhone,
      items: orderItems,
      total: cartTotalAmount,
      deliveryType: tenant.allowDelivery ? deliveryType : 'pickup',
      status: 'pending'
    });

    // Success
    setSuccessOrderCode(code);
    setCart({});
    setIsCheckoutOpen(false);
  };

  const handleCopyCode = () => {
    if (successOrderCode) {
      navigator.clipboard.writeText(successOrderCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className={`min-h-screen pb-28 ${themeStyles.primaryBg} ${fontClass} transition-colors duration-300 relative`}>
      
      {/* 1. PUBLIC NAV BAR */}
      <nav className={`${themeStyles.headerBg} text-white py-3.5 px-4 shadow-md sticky top-0 z-40 transition-all`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.customization.logoUrl ? (
              <img 
                src={tenant.customization.logoUrl} 
                alt="Logo" 
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center font-bold border border-white/20">
                🧪
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold tracking-tight leading-tight sm:text-base">
                {tenant.name}
              </h2>
              <span className="text-[10px] text-white/80 font-medium tracking-wider uppercase block sm:inline sm:ml-1">
                Tienda de Productos Químicos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Delivery Availability Status Info */}
            <div className="hidden md:flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-medium border border-white/10">
              {tenant.allowDelivery ? (
                <>
                  <Truck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Envíos Habilitados</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  <span>Solo Retiro en Local</span>
                </>
              )}
            </div>

            {/* Map Link / Location Button */}
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-bold transition-all focus:outline-none cursor-pointer hover:scale-105 shadow-sm"
              title="Ver ubicación de la tienda en el mapa"
            >
              <MapPin className="w-4 h-4 text-white" />
              <span>Mi Tienda</span>
            </a>

            {/* Share Store dropdown */}
            <div className="relative">
              <button
                id="public-share-store-toggle"
                onClick={() => setIsShareOpen(!isShareOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all focus:outline-none cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartir</span>
              </button>

              {/* Share Dropdown */}
              {isShareOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200 z-50 animate-fade-in">
                  <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Compartir esta Tienda</span>
                    <button 
                      onClick={() => setIsShareOpen(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-2 space-y-1 text-left">
                    {/* WhatsApp option */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `👋 ¡Hola! Te invito a visitar la tienda online de *${tenant.name}*. Podés ver nuestros productos, ofertas especiales y hacer tu pedido de forma rápida y sencilla desde aquí:\n\n🔗 ${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs rounded-xl hover:bg-emerald-600/10 hover:text-emerald-400 transition-colors cursor-pointer text-left font-medium block"
                      onClick={() => setIsShareOpen(false)}
                    >
                      <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg inline-flex items-center">
                        <Share2 className="w-3.5 h-3.5" />
                      </span>
                      <span>Compartir por WhatsApp</span>
                    </a>

                    {/* Email option */}
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Catálogo Online de ${tenant.name}`)}&body=${encodeURIComponent(
                        `¡Hola!\n\nTe invito a visitar la tienda online de ${tenant.name}.\nPodés ver nuestros productos, ofertas especiales y hacer tu pedido de forma rápida y sencilla desde aquí:\n\n${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`
                      )}`}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs rounded-xl hover:bg-indigo-600/10 hover:text-indigo-400 transition-colors cursor-pointer text-left font-medium block"
                      onClick={() => setIsShareOpen(false)}
                    >
                      <span className="p-1 bg-indigo-500/10 text-indigo-400 rounded-lg inline-flex items-center">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                      <span>Compartir por Email</span>
                    </a>

                    {/* Copy Link option */}
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`;
                        navigator.clipboard.writeText(url);
                        setIsShareCopied(true);
                        setTimeout(() => setIsShareCopied(false), 2000);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium text-slate-200"
                    >
                      <span className="p-1 bg-slate-800 text-slate-400 rounded-lg inline-flex items-center">
                        {isShareCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span>{isShareCopied ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Access Shield Button */}
            {onGoToAdmin && (
              <button
                id="public-admin-shield-btn"
                onClick={onGoToAdmin}
                title="Acceso Administrativo"
                className="flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all focus:outline-none cursor-pointer"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 2. PROMOTIONS BANNER & HERO CUSTOM SLOGAN */}
      <header className="max-w-6xl mx-auto px-4 pt-6 pb-2 text-center">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Venta Directa
          </span>
          <h1 className="text-2xl sm:text-3.5xl font-black text-slate-800 tracking-tight leading-tight">
            {tenant.customization.welcomeSlogan}
          </h1>
          <p className="mt-3 text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {tenant.customization.aboutText}
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        
        {/* 3. CATÁLOGO CON PESTAÑAS (Todos · 🔥 Ofertas · categorías) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          
          {/* Header & Categories */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Catálogo de Productos
              </h3>
              <p className="text-xs text-slate-500">
                Selecciona por categoría y arma tu pedido directo.
              </p>
            </div>
            
            {/* Category horizontal scroll bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? `${themeStyles.primaryButton} text-white shadow-sm`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid list */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400">No encontramos productos en esta categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const qtyInCart = cart[product.id] || 0;
                const isItemPromo = product.isPromo && product.promoPrice;
                const activePrice = isItemPromo ? product.promoPrice : product.price;

                return (
                  <div 
                    key={product.id}
                    className={`bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md p-4 transition-all flex flex-col justify-between ${themeStyles.cardBorder}`}
                  >
                    <div>
                      {/* Product Image with gradient aspect */}
                      <div className="w-full h-44 bg-slate-100 rounded-lg overflow-hidden mb-3 relative group">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        {product.isPromo && (
                          <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            Oferta
                          </div>
                        )}
                        <span className="absolute bottom-2 right-2 bg-slate-900/75 text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                          {product.unit}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {product.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 mt-0.5 hover:text-emerald-600 transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Custom Attributes / Dynamic Fields */}
                        {product.customFields && product.customFields.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.customFields.map((field, idx) => (
                              <span key={idx} className="bg-emerald-50/70 text-emerald-800 text-[8.5px] px-1.5 py-0.5 rounded border border-emerald-100 leading-tight">
                                <strong>{field.key}:</strong> {field.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                      <div>
                        {isItemPromo ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 line-through leading-none">
                              ${product.price}
                            </span>
                            <span className="text-base font-black text-red-600 leading-tight">
                              ${product.promoPrice}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-black text-slate-800">
                            ${product.price}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Stock: {product.stock} {product.unit === 'Unidad' ? 'U' : product.unit}s
                        </span>
                      </div>

                      {/* Add Cart Controllers */}
                      {qtyInCart === 0 ? (
                        <button
                          onClick={() => handleUpdateQty(product.id, 1)}
                          disabled={product.stock <= 0}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm ${
                            product.stock <= 0
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : `${themeStyles.primaryButton} text-white`
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      ) : (
                        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                          <button 
                            onClick={() => handleUpdateQty(product.id, -1)}
                            className="p-1 text-slate-600 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold px-2 text-slate-800 min-w-[20px] text-center">
                            {qtyInCart}
                          </span>
                          <button 
                            onClick={() => handleUpdateQty(product.id, 1)}
                            className="p-1 text-slate-600 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer & Map Location */}
      <footer className="max-w-6xl mx-auto px-4 mt-12 mb-8 text-center border-t border-slate-200/40 pt-6">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} {tenant.name}. Todos los derechos reservados.
        </p>
        <p className="text-[11px] text-slate-400/80 mt-1 font-medium">
          ¿Querés tu página? Contactate: <a href="mailto:dragoprot26@gmail.com" className="text-indigo-500 hover:underline font-semibold">dragoprot26@gmail.com</a>
        </p>
      </footer>

      {/* 5. FLOATING CENTRAL CHEMICAL BASKET */}
      {/* Centered at the bottom, mimicking an active cart with nice glowing alerts */}
      <div 
        id="central-floating-basket-container"
        className="fixed bottom-6 left-0 right-0 mx-auto z-40 w-full max-w-sm px-4"
      >
        <button
          id="central-floating-basket-btn"
          onClick={() => {
            if (totalItemsCount > 0) {
              setIsCheckoutOpen(true);
            } else {
              alert('Su canasto está vacío. Agregue productos para encargar.');
            }
          }}
          className={`w-full py-3 px-5 rounded-full flex items-center justify-between gap-3 shadow-2xl border transition-all cursor-pointer select-none active:scale-95 ${
            totalItemsCount > 0
              ? 'bg-slate-900 border-slate-800 text-white animate-bounce-short'
              : 'bg-slate-400/20 backdrop-blur-md border-slate-300 text-slate-600 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full relative transition-colors ${totalItemsCount > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
              <ShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block leading-tight">
                Canasto Químico
              </span>
              <span className="text-xs text-slate-300">
                {totalItemsCount > 0 ? `${totalItemsCount} artículos agregados` : 'Canasto vacío'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-100">
              ${cartTotalAmount.toLocaleString('es-AR')}
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </div>
        </button>
      </div>

      {/* 6. SLIDE-UP CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className={`w-5 h-5 ${themeStyles.accentText}`} />
                <h3 className="text-base font-bold text-slate-800">Resumen del Canasto</h3>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-5 overflow-y-auto flex-1">
              {/* Product items list */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  <span>Detalle de Artículos</span>
                  <button 
                    onClick={handleClearCart}
                    className="text-red-500 hover:text-red-700 flex items-center gap-0.5 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Vaciar
                  </button>
                </div>

                {cartItems.map(({ product, quantity, itemTotal }) => {
                  const isItemPromo = product.isPromo && product.promoPrice;
                  const unitPrice = isItemPromo ? product.promoPrice : product.price;

                  return (
                    <div key={product.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block leading-tight">{product.name}</span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {quantity} x ${unitPrice} / {product.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">${itemTotal}</span>
                        
                        {/* Inline micro controls */}
                        <div className="flex items-center bg-slate-100 rounded-md border border-slate-200 p-0.5">
                          <button 
                            onClick={() => handleUpdateQty(product.id, -1)}
                            className="p-0.5 text-slate-600 hover:bg-slate-200 rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold px-1.5 text-slate-800">
                            {quantity}
                          </span>
                          <button 
                            onClick={() => handleUpdateQty(product.id, 1)}
                            className="p-0.5 text-slate-600 hover:bg-slate-200 rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">Monto Total de Compra:</span>
                  <span className="text-lg font-black text-slate-900">${cartTotalAmount}</span>
                </div>
              </div>

              {/* Customer Checkout Form */}
              <form onSubmit={handleConfirmOrder} className="space-y-4 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Datos Obligatorios del Comprador
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="customer-name" className="text-xs font-semibold text-slate-600 block mb-1">
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="customer-name"
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="customer-phone" className="text-xs font-semibold text-slate-600 block mb-1">
                      Teléfono / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="customer-phone"
                        type="tel"
                        required
                        placeholder="Ej. +54 9 11 1234-5678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Type Option Selector */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Modalidad de Entrega
                  </span>
                  
                  <div className={`grid gap-3 ${tenant.allowDelivery ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Pickup Button */}
                    <button
                      id="opt-delivery-pickup"
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`p-3 rounded-xl border-2 text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                        deliveryType === 'pickup'
                          ? 'border-emerald-500 bg-emerald-50/20 text-slate-800'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${deliveryType === 'pickup' ? 'text-emerald-500' : ''}`} />
                      <div>
                        <span className="text-xs font-bold block leading-tight">Retiro en Local</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Retira sin costo en sucursal</span>
                      </div>
                    </button>

                    {/* Delivery Button (Checks if tenant allows it) */}
                    {tenant.allowDelivery && (
                      <button
                        id="opt-delivery-home"
                        type="button"
                        onClick={() => setDeliveryType('delivery')}
                        className={`p-3 rounded-xl border-2 text-left flex items-start gap-2.5 transition-all relative cursor-pointer ${
                          deliveryType === 'delivery'
                            ? 'border-emerald-500 bg-emerald-50/20 text-slate-800'
                            : 'border-slate-100 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <Truck className={`w-4 h-4 shrink-0 mt-0.5 ${deliveryType === 'delivery' ? 'text-emerald-500' : ''}`} />
                        <div>
                          <span className="text-xs font-bold block leading-tight">Envío a Domicilio</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Entrega express coordinada</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Encargar Order */}
                <button
                  id="submit-order-checkout-btn"
                  type="submit"
                  className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md mt-4 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    themeStyles.primaryButton
                  } text-white`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  Realizar Pedido / Encargar Compra
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 7. ORDER CONFIRMATION / CODE RETRIEVAL MODAL */}
      {successOrderCode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center border border-slate-100 animate-scale-up">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 text-emerald-500">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 tracking-tight">
              ¡Pedido Encargado con Éxito!
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Hemos registrado tu solicitud. Presenta el siguiente código para el retiro o coordinación del envío.
            </p>

            {/* Glowing Code Container */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 my-5 flex flex-col items-center justify-center relative group">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Código Único de Pedido
              </span>
              <span className="text-2xl font-black text-slate-800 tracking-wider">
                {successOrderCode}
              </span>

              {/* Copy Action Button */}
              <button
                onClick={handleCopyCode}
                className="mt-2.5 flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-bold cursor-pointer transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar Código
                  </>
                )}
              </button>
            </div>

            {/* Instruction context block */}
            <div className="text-xs text-left text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 mb-5">
              <strong className="text-slate-700 block">¿Cómo sigo mi pedido?</strong>
              <p className="text-[11px] leading-snug">
                1. El administrador de la tienda revisará el stock y preparará tu encargo.
              </p>
              <p className="text-[11px] leading-snug">
                2. Verás avisos en tu campana de notificaciones al cambiar el estado.
              </p>
            </div>

            <button
              id="close-success-order-modal-btn"
              onClick={() => setSuccessOrderCode(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
            >
              Entendido, volver a la tienda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
