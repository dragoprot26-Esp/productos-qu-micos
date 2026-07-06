import React, { useState, useEffect, useRef } from 'react';
import { Tenant, Product, Order, Client, AppNotification, Collaborator } from './types';
import { INITIAL_TENANTS, INITIAL_PRODUCTS } from './data';
import PublicPage from './components/PublicPage';
import AdminPanel from './components/AdminPanel';
import { Bell, Sparkles, X } from 'lucide-react';
import {
  estaLogueado, miMembresia, cloudLoad, cloudSave,
  quimPublica, quimAgregarPedido, signOutGlobal,
} from './db/cloud';

// ── Plantillas (una tienda por licencia) ────────────────────────────────
const placeholderTenant: Tenant = {
  id: '',
  name: 'Mi Comercio',
  subdomain: 'tienda',
  customization: {
    theme: 'eco-green',
    fontFamily: 'font-sans',
    welcomeSlogan: '',
    aboutText: '',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    logoUrl: '',
    mapUrl: '',
  },
  allowDelivery: true,
  adminTheme: 'slate-dark',
};

// Tienda semilla la primera vez que un dueño entra (a partir del molde eco).
function makeSeedTenant(codigo: string): Tenant {
  const base = INITIAL_TENANTS[0];
  return { ...base, id: codigo, subdomain: (codigo || 'tienda').toLowerCase() };
}
function makeSeedProducts(codigo: string): Product[] {
  return INITIAL_PRODUCTS
    .filter(p => p.tenantId === 'eco-quimica')
    .map(p => ({ ...p, tenantId: codigo }));
}

type SessionUser = { role: 'admin' | 'colaborador'; username: string; name: string; codigo: string };

export default function App() {
  // --- CORE STATE (una tienda) ---
  const [tenant, setTenant] = useState<Tenant>(placeholderTenant);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // --- NAVIGATION / IDENTITY ---
  const [licenseCode, setLicenseCode] = useState<string>('');
  const [currentView, setCurrentView] = useState<'public' | 'admin' | 'preview'>('public');
  const [ready, setReady] = useState(false);

  // --- AUTH ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<SessionUser | null>(null);

  // --- FLOATING TOAST ---
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  const debounceRef = useRef<any>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────
  async function loadAdminData(codigo: string) {
    const blob = await cloudLoad(codigo);
    if (blob && blob.tenant && Object.keys(blob.tenant).length) {
      setTenant({ ...placeholderTenant, ...blob.tenant, id: codigo });
      setProducts(blob.products || []);
      setOrders(blob.orders || []);
      setClients(blob.clients || []);
      setNotifications(blob.notifications || []);
      setCollaborators(blob.collaborators || []);
    } else {
      // Primera vez: sembramos una tienda de arranque
      setTenant(makeSeedTenant(codigo));
      setProducts(makeSeedProducts(codigo));
      setOrders([]);
      setClients([]);
      setNotifications([]);
      setCollaborators([]);
    }
  }

  useEffect(() => {
    (async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch { /* noop */ }
      }

      const params = new URLSearchParams(window.location.search);
      const codigo = (params.get('codigo') || params.get('tenant') || '').trim();

      // 1) Vidriera pública del cliente (?codigo=QUIM-...)
      if (codigo) {
        setLicenseCode(codigo);
        setCurrentView('public');
        const pub = await quimPublica(codigo);
        if (pub) {
          if (pub.tenant && Object.keys(pub.tenant).length) {
            setTenant({ ...placeholderTenant, ...pub.tenant, id: codigo });
          } else {
            setTenant(makeSeedTenant(codigo));
          }
          setProducts(pub.products || []);
        }
        setReady(true);
        return;
      }

      // 2) Panel del dueño/colaborador si hay sesión activa
      if (estaLogueado()) {
        const mem = await miMembresia();
        if (mem && mem.tenant_id) {
          setIsLoggedIn(true);
          setLoggedInUser({
            role: mem.rol === 'colab' ? 'colaborador' : 'admin',
            username: mem.usuario,
            name: mem.usuario,
            codigo: mem.tenant_id,
          });
          setLicenseCode(mem.tenant_id);
          await loadAdminData(mem.tenant_id);
          setCurrentView('admin');
          setReady(true);
          return;
        }
      }

      // 3) Sin sesión ni código → pantalla de login del panel
      setCurrentView('admin');
      setReady(true);
    })();
  }, []);

  // ── Guardado automático a la nube (fusiona, NO pisa pedidos ajenos) ────
  // Antes de escribir, releemos la nube y unimos los pedidos/notifs que hayan
  // entrado desde la tienda pública o desde el otro usuario (admin/colaborador),
  // así nadie se pisa los encargos.
  useEffect(() => {
    if (!ready || !isLoggedIn || !licenseCode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const nube = await cloudLoad(licenseCode);
      const unir = (locales: any[], remotos: any[]) => {
        const ids = new Set((locales || []).map(o => o.id));
        return [...(locales || []), ...((remotos || []).filter(o => !ids.has(o.id)))];
      };
      const ordersMerged = unir(orders, nube?.orders || []);
      const notifsMerged = unir(notifications, nube?.notifications || []);
      const clientsMerged = unir(clients, nube?.clients || []);
      await cloudSave(licenseCode, {
        tenant, products,
        orders: ordersMerged,
        clients: clientsMerged,
        notifications: notifsMerged,
        collaborators,
      });
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [tenant, products, orders, clients, notifications, collaborators, isLoggedIn, licenseCode, ready]);

  // ── Campanita: sondeo de pedidos (cada 8s). La nube manda para los pedidos
  // ya existentes (para que admin y colaborador vean los cambios de estado),
  // pero no se descartan pedidos locales que todavía no llegaron a la nube.
  useEffect(() => {
    if (!isLoggedIn || !licenseCode) return;
    const iv = setInterval(async () => {
      const blob = await cloudLoad(licenseCode);
      if (!blob) return;
      if (blob.orders) {
        const cloudOrders = blob.orders as Order[];
        const cloudIds = new Set(cloudOrders.map(o => o.id));
        setOrders(prev => {
          const localOnly = prev.filter(o => !cloudIds.has(o.id));
          const merged = [...cloudOrders, ...localOnly];
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          const nuevos = cloudOrders.filter(no => !prev.some(po => po.id === no.id));
          if (prev.length && nuevos.length) {
            nuevos.forEach(no => {
              triggerPushToast({
                id: Math.random().toString(36).substring(7),
                tenantId: licenseCode,
                title: '🚨 Nuevo Pedido Encargado',
                message: `El cliente "${no.customerName}" encargó el pedido ${no.code} por un total de $${no.total}.`,
                isRead: false,
                createdAt: new Date().toISOString(),
                orderId: no.id,
                type: 'new_order',
              });
            });
          }
          return merged;
        });
      }
      if (blob.notifications) setNotifications(blob.notifications as AppNotification[]);
    }, 8000);
    return () => clearInterval(iv);
  }, [isLoggedIn, licenseCode]);

  // ── Save helpers (solo estado; el efecto de arriba persiste a la nube) ─
  const saveProducts = (updated: Product[]) => setProducts(updated);
  const saveOrders = (updated: Order[]) => setOrders(updated);
  const saveClients = (updated: Client[]) => setClients(updated);
  const saveNotifications = (updated: AppNotification[]) => setNotifications(updated);
  const saveCollaborators = (updated: Collaborator[]) => setCollaborators(updated);

  // ── Auth handlers ─────────────────────────────────────────────────────
  const handleLogin = async (user: SessionUser) => {
    setIsLoggedIn(true);
    setLoggedInUser(user);
    setLicenseCode(user.codigo);
    await loadAdminData(user.codigo);
    setCurrentView('admin');
  };

  const handleLogout = async () => {
    try { await signOutGlobal(); } catch { /* noop */ }
    setIsLoggedIn(false);
    setLoggedInUser(null);
    setLicenseCode('');
    setTenant(placeholderTenant);
    setProducts([]); setOrders([]); setClients([]); setNotifications([]); setCollaborators([]);
  };

  // ── Tenant / branding ─────────────────────────────────────────────────
  const handleUpdateTenant = (updated: Tenant) => setTenant({ ...updated, id: licenseCode || updated.id });

  // ── Crear pedido (público por RPC / admin local) ──────────────────────
  const handlePlaceOrder = (orderData: Omit<Order, 'id' | 'code' | 'createdAt'>): string => {
    const prefix = (tenant.subdomain || 'quim').substring(0, 4).toUpperCase();
    const uniqueDigits = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `${prefix}-${uniqueDigits}`;

    const newOrder: Order = {
      id: Math.random().toString(36).substring(7),
      code: orderCode,
      createdAt: new Date().toISOString(),
      ...orderData,
      tenantId: licenseCode || orderData.tenantId,
    };

    // Cliente público (no logueado): mandamos el pedido por RPC seguro.
    if (!isLoggedIn) {
      quimAgregarPedido(licenseCode, newOrder);
      setOrders(prev => [newOrder, ...prev]); // feedback optimista
      return orderCode;
    }

    // Dueño/colaborador (preview o carga manual): actualización local completa.
    const nextProducts = products.map(prod => {
      const matchItem = orderData.items.find(it => it.productId === prod.id);
      return matchItem ? { ...prod, stock: Math.max(0, prod.stock - matchItem.quantity) } : prod;
    });
    saveProducts(nextProducts);

    const existingClient = clients.find(c => c.phone === orderData.customerPhone);
    if (existingClient) {
      saveClients(clients.map(c => c.id === existingClient.id ? {
        ...c,
        totalSpent: c.totalSpent + orderData.total,
        ordersCount: c.ordersCount + 1,
        lastOrderDate: new Date().toISOString().substring(0, 10),
      } : c));
    } else {
      saveClients([...clients, {
        id: Math.random().toString(36).substring(7),
        tenantId: licenseCode,
        name: orderData.customerName,
        phone: orderData.customerPhone,
        lastOrderDate: new Date().toISOString().substring(0, 10),
        totalSpent: orderData.total,
        ordersCount: 1,
      }]);
    }

    saveOrders([newOrder, ...orders]);

    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(7),
      tenantId: licenseCode,
      title: '🚨 Nuevo Pedido Encargado',
      message: `El cliente "${orderData.customerName}" encargó el pedido ${orderCode} por un total de $${orderData.total}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      orderId: newOrder.id,
      type: 'new_order',
    };
    saveNotifications([newNotif, ...notifications]);
    triggerPushToast(newNotif);

    return orderCode;
  };

  // ── CRUD productos ────────────────────────────────────────────────────
  const handleAddProduct = (prodData: Omit<Product, 'id'>) => {
    saveProducts([...products, { id: Math.random().toString(36).substring(7), ...prodData, tenantId: licenseCode }]);
  };
  const handleEditProduct = (updated: Product) => saveProducts(products.map(p => p.id === updated.id ? updated : p));
  const handleDeleteProduct = (productId: string) => saveProducts(products.filter(p => p.id !== productId));

  // ── Estado de pedidos ─────────────────────────────────────────────────
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const quienNombre = loggedInUser ? (loggedInUser.name || loggedInUser.username) : '';
    const quienRol = loggedInUser ? (loggedInUser.role === 'admin' ? 'Dueño' : 'Vendedor') : '';
    saveOrders(orders.map(o => o.id === orderId
      ? { ...o, status, atendidoPor: quienNombre, atendidoPorRol: quienRol }
      : o));

    const orderObj = orders.find(o => o.id === orderId);
    if (!orderObj) return;

    let statusLabel = '';
    let notificationTitle = '';
    if (status === 'preparing') {
      statusLabel = 'se está preparando en laboratorio.';
      notificationTitle = '⚙ Pedido en Preparación';
    } else if (status === 'ready_or_shipped') {
      statusLabel = orderObj.deliveryType === 'delivery'
        ? 'ha sido despachado en camino a su domicilio.'
        : 'ya se encuentra listo para retirar en local.';
      notificationTitle = orderObj.deliveryType === 'delivery' ? '🚚 Pedido Despachado' : '🏪 Listo para Retirar';
    } else if (status === 'completed') {
      statusLabel = 'ha sido retirado/entregado con éxito. ¡Gracias por confiar en nosotros!';
      notificationTitle = '✓ Pedido Entregado';
    } else if (status === 'cancelled') {
      statusLabel = 'ha sido cancelado por falta de stock o fuerza mayor.';
      notificationTitle = '❌ Pedido Cancelado';
    }

    if (statusLabel) {
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substring(7),
        tenantId: licenseCode,
        title: notificationTitle,
        message: `Tu pedido ${orderObj.code} ${statusLabel}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        orderId: orderObj.id,
        type: 'status_change',
      };
      saveNotifications([newNotif, ...notifications]);
      triggerPushToast(newNotif);
    }
  };

  // ── Simular pedido entrante (demo del panel) ──────────────────────────
  const handleSimulateIncomingOrder = () => {
    const names = ['María Belén', 'Juan Cruz', 'Sofia Santillán', 'Gastón Alarcón', 'Clara De Benedictis'];
    const phones = ['+54 11 9855-4321', '+54 341 520-9900', '+54 261 445-5566', '+54 9 11 3344-7788'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomPhone = phones[Math.floor(Math.random() * phones.length)];

    const disponibles = products.filter(p => p.stock > 0);
    if (disponibles.length === 0) { alert('Debe tener productos cargados con stock para simular compras.'); return; }

    const itemProducts = disponibles.slice(0, Math.floor(1 + Math.random() * 2));
    const items = itemProducts.map(p => {
      const activePrice = p.isPromo && p.promoPrice ? p.promoPrice : p.price;
      return { productId: p.id, name: p.name, quantity: Math.floor(1 + Math.random() * 3), price: activePrice };
    });
    const total = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const deliveryType = tenant.allowDelivery ? (Math.random() > 0.5 ? 'delivery' : 'pickup') : 'pickup';

    handlePlaceOrder({
      tenantId: licenseCode,
      customerName: randomName,
      customerPhone: randomPhone,
      items,
      total,
      deliveryType,
      status: 'pending',
    });
  };

  // ── Toast + sonido ────────────────────────────────────────────────────
  const triggerPushToast = (notif: AppNotification) => {
    setActiveToast(notif);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) { /* noop */ }

    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(notif.title, { body: notif.message, icon: tenant.customization.logoUrl }); } catch { /* noop */ }
    }

    setTimeout(() => setActiveToast(cur => (cur && cur.id === notif.id ? null : cur)), 6000);
  };

  const handleMarkNotificationsRead = () => saveNotifications(notifications.map(n => ({ ...n, isRead: true })));
  const handleClearNotificationsForTenant = () => saveNotifications([]);

  // ── Loader ────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 font-sans">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
          Cargando tienda…
        </div>
      </div>
    );
  }

  const publicOrPreview = currentView === 'public' || currentView === 'preview';

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 select-none antialiased">
      <div className="flex-1">
        {currentView === 'preview' && (
          <div className="bg-indigo-950 text-indigo-100 px-4 py-2 flex items-center justify-between border-b border-indigo-800 shadow-md sticky top-0 z-50 font-sans">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">Modo Vista Previa de Tienda</span>
              <span className="text-[10.5px] text-indigo-300 hidden sm:inline">({tenant.name})</span>
            </div>
            <button
              onClick={() => setCurrentView('admin')}
              className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-indigo-950 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span>← Volver al Panel Admin</span>
            </button>
          </div>
        )}

        {publicOrPreview ? (
          <PublicPage
            tenant={tenant}
            products={products}
            onPlaceOrder={handlePlaceOrder}
            notifications={notifications}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onGoToAdmin={() => setCurrentView('admin')}
          />
        ) : (
          <AdminPanel
            tenant={tenant}
            tenants={[tenant]}
            onSelectTenant={() => {}}
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
              <button onClick={() => setActiveToast(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <strong className="text-sm font-extrabold text-white block mt-0.5">{activeToast.title}</strong>
            <p className="text-xs text-slate-400 mt-1">{activeToast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
