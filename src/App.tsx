import React, { useState, useEffect } from 'react';
import { Tenant, Product, Order, Client, AppNotification, Collaborator } from './types';
import { 
  INITIAL_TENANTS, 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_CLIENTS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_COLLABORATORS
} from './data';
import TenantSelector from './components/TenantSelector';
import PublicPage from './components/PublicPage';
import AdminPanel from './components/AdminPanel';
import { Bell, Sparkles, X, Check } from 'lucide-react';

export default function App() {
  // --- CORE STATE ---
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  
  // --- NAVIGATION STATE ---
  const [currentTenantId, setCurrentTenantId] = useState<string>('eco-quimica');
  const [currentView, setCurrentView] = useState<'public' | 'admin' | 'preview'>('public');

  // --- AUTHENTICATION STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('chem_is_logged_in') === 'true';
  });
  const [loggedInUser, setLoggedInUser] = useState<{ role: 'admin' | 'colaborador'; username: string; name: string } | null>(() => {
    const saved = localStorage.getItem('chem_logged_in_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user: { role: 'admin' | 'colaborador'; username: string; name: string }) => {
    setIsLoggedIn(true);
    setLoggedInUser(user);
    localStorage.setItem('chem_is_logged_in', 'true');
    localStorage.setItem('chem_logged_in_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser(null);
    localStorage.removeItem('chem_is_logged_in');
    localStorage.removeItem('chem_logged_in_user');
  };

  // --- FLOATING REAL-TIME TOAST STATE ---
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // --- LOAD AND PERSISTENCE IN LOCALSTORAGE ---
  const postToServer = async (key: string, data: any) => {
    try {
      await fetch('/api/store-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data })
      });
    } catch (err) {
      console.warn('Backend server not reachable for saving:', err);
    }
  };

  useEffect(() => {
    const fetchAndLoadData = async () => {
      let serverData: Record<string, any> = {};
      try {
        const response = await fetch('/api/store-data');
        if (response.ok) {
          serverData = await response.json();
        }
      } catch (err) {
        console.warn('Backend server not yet ready, using client storage:', err);
      }

      // --- TENANTS ---
      const hasServerTenants = serverData && serverData.chem_tenants && serverData.chem_tenants.length > 0;
      if (hasServerTenants) {
        setTenants(serverData.chem_tenants);
        localStorage.setItem('chem_tenants', JSON.stringify(serverData.chem_tenants));
      } else {
        const storedTenants = localStorage.getItem('chem_tenants');
        if (storedTenants) {
          const parsed = JSON.parse(storedTenants);
          setTenants(parsed);
          postToServer('chem_tenants', parsed);
        } else {
          setTenants(INITIAL_TENANTS);
          localStorage.setItem('chem_tenants', JSON.stringify(INITIAL_TENANTS));
          postToServer('chem_tenants', INITIAL_TENANTS);
        }
      }

      // --- PRODUCTS ---
      const hasServerProducts = serverData && serverData.chem_products && serverData.chem_products.length > 0;
      if (hasServerProducts) {
        setProducts(serverData.chem_products);
        localStorage.setItem('chem_products', JSON.stringify(serverData.chem_products));
      } else {
        const storedProducts = localStorage.getItem('chem_products');
        if (storedProducts) {
          const parsed = JSON.parse(storedProducts);
          setProducts(parsed);
          postToServer('chem_products', parsed);
        } else {
          setProducts(INITIAL_PRODUCTS);
          localStorage.setItem('chem_products', JSON.stringify(INITIAL_PRODUCTS));
          postToServer('chem_products', INITIAL_PRODUCTS);
        }
      }

      // --- ORDERS ---
      const hasServerOrders = serverData && serverData.chem_orders;
      if (hasServerOrders) {
        setOrders(serverData.chem_orders);
        localStorage.setItem('chem_orders', JSON.stringify(serverData.chem_orders));
      } else {
        const storedOrders = localStorage.getItem('chem_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          setOrders(parsed);
          postToServer('chem_orders', parsed);
        } else {
          setOrders(INITIAL_ORDERS);
          localStorage.setItem('chem_orders', JSON.stringify(INITIAL_ORDERS));
          postToServer('chem_orders', INITIAL_ORDERS);
        }
      }

      // --- CLIENTS ---
      const hasServerClients = serverData && serverData.chem_clients;
      if (hasServerClients) {
        setClients(serverData.chem_clients);
        localStorage.setItem('chem_clients', JSON.stringify(serverData.chem_clients));
      } else {
        const storedClients = localStorage.getItem('chem_clients');
        if (storedClients) {
          const parsed = JSON.parse(storedClients);
          setClients(parsed);
          postToServer('chem_clients', parsed);
        } else {
          setClients(INITIAL_CLIENTS);
          localStorage.setItem('chem_clients', JSON.stringify(INITIAL_CLIENTS));
          postToServer('chem_clients', INITIAL_CLIENTS);
        }
      }

      // --- NOTIFICATIONS ---
      const hasServerNotifications = serverData && serverData.chem_notifications;
      if (hasServerNotifications) {
        setNotifications(serverData.chem_notifications);
        localStorage.setItem('chem_notifications', JSON.stringify(serverData.chem_notifications));
      } else {
        const storedNotifications = localStorage.getItem('chem_notifications');
        if (storedNotifications) {
          const parsed = JSON.parse(storedNotifications);
          setNotifications(parsed);
          postToServer('chem_notifications', parsed);
        } else {
          setNotifications(INITIAL_NOTIFICATIONS);
          localStorage.setItem('chem_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
          postToServer('chem_notifications', INITIAL_NOTIFICATIONS);
        }
      }

      // --- COLLABORATORS ---
      const hasServerCollaborators = serverData && serverData.chem_collaborators && serverData.chem_collaborators.length > 0;
      if (hasServerCollaborators) {
        setCollaborators(serverData.chem_collaborators);
        localStorage.setItem('chem_collaborators', JSON.stringify(serverData.chem_collaborators));
      } else {
        const storedCollaborators = localStorage.getItem('chem_collaborators');
        if (storedCollaborators) {
          const parsed = JSON.parse(storedCollaborators);
          setCollaborators(parsed);
          postToServer('chem_collaborators', parsed);
        } else {
          setCollaborators(INITIAL_COLLABORATORS);
          localStorage.setItem('chem_collaborators', JSON.stringify(INITIAL_COLLABORATORS));
          postToServer('chem_collaborators', INITIAL_COLLABORATORS);
        }
      }
    };

    fetchAndLoadData();

    // Attempt to request push notifications permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Read ?tenant=abc from URL query string if present (for QR codes scan)
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get('tenant');
    if (tenantParam) {
      setCurrentTenantId(tenantParam);
      setCurrentView('public'); // Default to store view for customers scanning QR
    }
  }, []);

  // Periodically poll backend for any remote updates (e.g., order placed on phone)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/store-data');
        if (response.ok) {
          const serverData = await response.json();
          
          if (serverData.chem_orders) {
            const ordersStr = JSON.stringify(serverData.chem_orders);
            const localOrdersStr = localStorage.getItem('chem_orders');
            if (ordersStr !== localOrdersStr) {
              setOrders(serverData.chem_orders);
              localStorage.setItem('chem_orders', ordersStr);
              
              if (localOrdersStr) {
                const prevOrders = JSON.parse(localOrdersStr) as Order[];
                if (serverData.chem_orders.length > prevOrders.length) {
                  const newOrders = (serverData.chem_orders as Order[]).filter(
                    no => !prevOrders.some(po => po.id === no.id)
                  );
                  newOrders.forEach(no => {
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('🚨 Nuevo Pedido Encargado', {
                        body: `El cliente "${no.customerName}" ha encargado un pedido (${no.code}) por un total de $${no.total}.`
                      });
                    }
                  });
                }
              }
            }
          }

          if (serverData.chem_notifications) {
            const notifsStr = JSON.stringify(serverData.chem_notifications);
            const localNotifsStr = localStorage.getItem('chem_notifications');
            if (notifsStr !== localNotifsStr) {
              setNotifications(serverData.chem_notifications);
              localStorage.setItem('chem_notifications', notifsStr);
            }
          }

          if (serverData.chem_products) {
            const productsStr = JSON.stringify(serverData.chem_products);
            const localProductsStr = localStorage.getItem('chem_products');
            if (productsStr !== localProductsStr) {
              setProducts(serverData.chem_products);
              localStorage.setItem('chem_products', productsStr);
            }
          }

          if (serverData.chem_tenants) {
            const tenantsStr = JSON.stringify(serverData.chem_tenants);
            const localTenantsStr = localStorage.getItem('chem_tenants');
            if (tenantsStr !== localTenantsStr) {
              setTenants(serverData.chem_tenants);
              localStorage.setItem('chem_tenants', tenantsStr);
            }
          }

          if (serverData.chem_clients) {
            const clientsStr = JSON.stringify(serverData.chem_clients);
            const localClientsStr = localStorage.getItem('chem_clients');
            if (clientsStr !== localClientsStr) {
              setClients(serverData.chem_clients);
              localStorage.setItem('chem_clients', clientsStr);
            }
          }

          if (serverData.chem_collaborators) {
            const colabsStr = JSON.stringify(serverData.chem_collaborators);
            const localColabsStr = localStorage.getItem('chem_collaborators');
            if (colabsStr !== localColabsStr) {
              setCollaborators(serverData.chem_collaborators);
              localStorage.setItem('chem_collaborators', colabsStr);
            }
          }
        }
      } catch (err) {
        // Silent
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Save helpers
  const saveTenants = (updated: Tenant[]) => {
    setTenants(updated);
    localStorage.setItem('chem_tenants', JSON.stringify(updated));
    postToServer('chem_tenants', updated);
  };

  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem('chem_products', JSON.stringify(updated));
    postToServer('chem_products', updated);
  };

  const saveOrders = (updated: Order[]) => {
    setOrders(updated);
    localStorage.setItem('chem_orders', JSON.stringify(updated));
    postToServer('chem_orders', updated);
  };

  const saveClients = (updated: Client[]) => {
    setClients(updated);
    localStorage.setItem('chem_clients', JSON.stringify(updated));
    postToServer('chem_clients', updated);
  };

  const saveNotifications = (updated: AppNotification[]) => {
    setNotifications(updated);
    localStorage.setItem('chem_notifications', JSON.stringify(updated));
    postToServer('chem_notifications', updated);
  };

  const saveCollaborators = (updated: Collaborator[]) => {
    setCollaborators(updated);
    localStorage.setItem('chem_collaborators', JSON.stringify(updated));
    postToServer('chem_collaborators', updated);
  };

  // Find currently active tenant details
  const currentTenant = tenants.find(t => t.id === currentTenantId) || tenants[0];

  // --- BUSINESS CALLBACK HANDLERS ---

  // Handle tenant brand customizations
  const handleUpdateTenant = (updated: Tenant) => {
    const nextTenants = tenants.map(t => t.id === updated.id ? updated : t);
    saveTenants(nextTenants);
  };

  // Create order from public storefront
  const handlePlaceOrder = (orderData: Omit<Order, 'id' | 'code' | 'createdAt'>): string => {
    // 1. Generate unique pick-up code (human-friendly, e.g. ECO-5142)
    const prefix = currentTenant.subdomain.substring(0, 3).toUpperCase();
    const uniqueDigits = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `${prefix}-${uniqueDigits}`;

    const newOrder: Order = {
      id: Math.random().toString(36).substring(7),
      code: orderCode,
      createdAt: new Date().toISOString(),
      ...orderData
    };

    // 2. Reduce products inventory stock levels
    const nextProducts = products.map(prod => {
      const matchItem = orderData.items.find(it => it.productId === prod.id);
      if (matchItem) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - matchItem.quantity)
        };
      }
      return prod;
    });
    saveProducts(nextProducts);

    // 3. Register or update client metrics (CRM)
    const existingClient = clients.find(c => c.tenantId === orderData.tenantId && c.phone === orderData.customerPhone);
    if (existingClient) {
      const nextClients = clients.map(c => c.id === existingClient.id ? {
        ...c,
        totalSpent: c.totalSpent + orderData.total,
        ordersCount: c.ordersCount + 1,
        lastOrderDate: new Date().toISOString().substring(0, 10)
      } : c);
      saveClients(nextClients);
    } else {
      const newClient: Client = {
        id: Math.random().toString(36).substring(7),
        tenantId: orderData.tenantId,
        name: orderData.customerName,
        phone: orderData.customerPhone,
        lastOrderDate: new Date().toISOString().substring(0, 10),
        totalSpent: orderData.total,
        ordersCount: 1
      };
      saveClients([...clients, newClient]);
    }

    // 4. Append to orders
    saveOrders([newOrder, ...orders]);

    // 5. Generate Real-time Push Alert notification
    const alertMsg = `El cliente "${orderData.customerName}" ha encargado un pedido (${orderCode}) por un total de $${orderData.total}.`;
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(7),
      tenantId: orderData.tenantId,
      title: '🚨 Nuevo Pedido Encargado',
      message: alertMsg,
      isRead: false,
      createdAt: new Date().toISOString(),
      orderId: newOrder.id,
      type: 'new_order'
    };
    saveNotifications([newNotif, ...notifications]);

    // Trigger local push visual slide-in
    triggerPushToast(newNotif);

    return orderCode;
  };

  // CRUD Product Actions
  const handleAddProduct = (prodData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      id: Math.random().toString(36).substring(7),
      ...prodData
    };
    saveProducts([...products, newProduct]);
  };

  const handleEditProduct = (updated: Product) => {
    const nextProducts = products.map(p => p.id === updated.id ? updated : p);
    saveProducts(nextProducts);
  };

  const handleDeleteProduct = (productId: string) => {
    const nextProducts = products.filter(p => p.id !== productId);
    saveProducts(nextProducts);
  };

  // Transition Order State
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const nextOrders = orders.map(o => o.id === orderId ? { ...o, status } : o);
    saveOrders(nextOrders);

    const orderObj = orders.find(o => o.id === orderId);
    if (!orderObj) return;

    // Build friendly description according to state
    let statusLabel = '';
    let notificationTitle = '';
    if (status === 'preparing') {
      statusLabel = 'se está preparando en laboratorio.';
      notificationTitle = '⚙ Pedido en Preparación';
    } else if (status === 'ready_or_shipped') {
      statusLabel = orderObj.deliveryType === 'delivery' 
        ? 'ha sido despachado en camino a su domicilio.' 
        : 'ya se encuentra listo para retirar en local sucursal.';
      notificationTitle = orderObj.deliveryType === 'delivery' ? '🚚 Pedido Despachado' : '🏪 Listo para Retirar';
    } else if (status === 'completed') {
      statusLabel = 'ha sido retirado/entregado con éxito. ¡Gracias por confiar en nosotros!';
      notificationTitle = '✓ Pedido Entregado';
    } else if (status === 'cancelled') {
      statusLabel = 'ha sido cancelado por falta de stock o fuerza mayor.';
      notificationTitle = '❌ Pedido Cancelado';
    }

    if (statusLabel) {
      const alertMsg = `Tu pedido ${orderObj.code} ${statusLabel}`;
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substring(7),
        tenantId: orderObj.tenantId,
        title: notificationTitle,
        message: alertMsg,
        isRead: false,
        createdAt: new Date().toISOString(),
        orderId: orderObj.id,
        type: 'status_change'
      };
      saveNotifications([newNotif, ...notifications]);
      triggerPushToast(newNotif);
    }
  };

  // Simulate External Client Order (Quick button demo)
  const handleSimulateIncomingOrder = () => {
    const names = ['María Belén', 'Juan Cruz', 'Sofia Santillán', 'Gastón Alarcón', 'Clara De Benedictis', 'Estanislao Soler'];
    const phones = ['+54 11 9855-4321', '+54 341 520-9900', '+54 261 445-5566', '+54 9 11 3344-7788'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomPhone = phones[Math.floor(Math.random() * phones.length)];

    // Grab 1 or 2 products for this tenant
    const currentTenantProducts = products.filter(p => p.tenantId === currentTenantId && p.stock > 0);
    if (currentTenantProducts.length === 0) {
      alert('Debe tener productos cargados con stock para simular compras.');
      return;
    }

    const itemProducts = currentTenantProducts.slice(0, Math.floor(1 + Math.random() * 2));
    const items = itemProducts.map(p => {
      const activePrice = p.isPromo && p.promoPrice ? p.promoPrice : p.price;
      return {
        productId: p.id,
        name: p.name,
        quantity: Math.floor(1 + Math.random() * 3),
        price: activePrice
      };
    });

    const total = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const deliveryType = currentTenant.allowDelivery ? (Math.random() > 0.5 ? 'delivery' : 'pickup') : 'pickup';

    // Place simulated order
    handlePlaceOrder({
      tenantId: currentTenantId,
      customerName: randomName,
      customerPhone: randomPhone,
      items,
      total,
      deliveryType,
      status: 'pending'
    });
  };

  // Helper to flash notifications Toast
  const triggerPushToast = (notif: AppNotification) => {
    setActiveToast(notif);
    
    // Play subtle audio synthetic warning beep via standard Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 chime
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be blocked or unsupported - fail silently
    }

    // Native browser push alert where authorized
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notif.title, {
        body: notif.message,
        icon: currentTenant.customization.logoUrl
      });
    }
  };

  const handleMarkNotificationsRead = () => {
    const nextNotifs = notifications.map(n => n.tenantId === currentTenantId ? { ...n, isRead: true } : n);
    saveNotifications(nextNotifs);
  };

  const handleClearNotificationsForTenant = () => {
    const nextNotifs = notifications.filter(n => n.tenantId !== currentTenantId);
    saveNotifications(nextNotifs);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 select-none antialiased">
      
      {/* 1. TOP SELECTOR CONTROLLER BAR */}
      {tenants.length > 0 && currentView === 'admin' && (
        <TenantSelector
          tenants={tenants}
          currentTenant={currentTenant}
          onSelectTenant={(id) => {
            setCurrentTenantId(id);
          }}
          currentView={currentView}
          onChangeView={(v) => setCurrentView(v)}
          onSimulateOrder={handleSimulateIncomingOrder}
        />
      )}

      {/* 2. CORE VIEW SWITCHER PORTALS */}
      {tenants.length > 0 && (
        <div className="flex-1">
          {currentView === 'preview' && (
            <div className="bg-indigo-950 text-indigo-100 px-4 py-2 flex items-center justify-between border-b border-indigo-800 shadow-md sticky top-0 z-50 font-sans">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">Modo Vista Previa de Tienda</span>
                <span className="text-[10.5px] text-indigo-300 hidden sm:inline">({currentTenant.name})</span>
              </div>
              <button
                onClick={() => setCurrentView('admin')}
                className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-indigo-950 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>← Volver al Panel Admin</span>
              </button>
            </div>
          )}

          {currentView === 'public' || currentView === 'preview' ? (
            <PublicPage
              tenant={currentTenant}
              products={products}
              onPlaceOrder={handlePlaceOrder}
              notifications={notifications}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onGoToAdmin={() => setCurrentView('admin')}
            />
          ) : (
            <AdminPanel
              tenant={currentTenant}
              tenants={tenants}
              onSelectTenant={setCurrentTenantId}
              onUpdateTenant={handleUpdateTenant}
              products={products}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              collaborators={collaborators}
              onAddCollaborator={(colab) => saveCollaborators([...collaborators, colab])}
              onDeleteCollaborator={(id) => saveCollaborators(collaborators.filter(c => c.id !== id))}
              onUpdateCollaborator={(colab) => saveCollaborators(collaborators.map(c => c.id === colab.id ? colab : c))}
              notifications={notifications}
              onClearNotifications={handleClearNotificationsForTenant}
              onTogglePreviewMode={() => setCurrentView('preview')}
              isLoggedIn={isLoggedIn}
              loggedInUser={loggedInUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          )}
        </div>
      )}

      {/* 3. SIMULATED FLOATING REAL-TIME PUSH NOTIFICATION TOAST */}
      {activeToast && (
        <div 
          id="realtime-push-toast-banner"
          className="fixed top-18 right-4 z-50 max-w-sm w-full bg-slate-900/95 border border-indigo-500/30 text-slate-100 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-up backdrop-blur-sm"
        >
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 leading-normal">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Alerta de Pedido
              </span>
              <button 
                onClick={() => setActiveToast(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <strong className="text-sm font-extrabold text-white block mt-0.5">
              {activeToast.title}
            </strong>
            <p className="text-xs text-slate-400 mt-1">
              {activeToast.message}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
              <span>Código: {activeToast.orderId ? 'REGISTRADO' : 'NOTIFICACION'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
