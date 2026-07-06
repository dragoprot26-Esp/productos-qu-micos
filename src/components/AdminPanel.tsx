import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Tenant, Product, Order, Client, AppNotification, AdminTab, Collaborator } from '../types';
import { THEME_PRESETS, FONT_PRESETS } from '../data';
import { validarLicencia, asegurarCuentaSeguraDueno, asegurarCuentaSeguraColab } from '../db/cloud';
import { bioSupported, bioEnabled, bioEnable, bioLogin } from '../db/biometric';
import { 
  BarChart3, 
  Layers, 
  Users, 
  ShoppingBag, 
  History, 
  Palette, 
  Settings, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  X, 
  Bell, 
  FileText, 
  Save, 
  Truck, 
  MapPin,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  UserPlus,
  Shield,
  Eye,
  LogOut,
  Smartphone,
  UploadCloud,
  Home,
  QrCode,
  Share2,
  Phone
} from 'lucide-react';

interface AdminPanelProps {
  tenant: Tenant;
  tenants: Tenant[];
  onSelectTenant: (id: string) => void;
  onUpdateTenant: (updated: Tenant) => void;
  products: Product[];
  onAddProduct: (prod: Omit<Product, 'id'>) => void;
  onEditProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  collaborators: Collaborator[];
  onAddCollaborator: (colab: Collaborator) => void;
  onDeleteCollaborator: (id: string) => void;
  onUpdateCollaborator: (colab: Collaborator) => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  onDeleteHistory?: () => void;
  onTogglePreviewMode?: () => void;
  isLoggedIn: boolean;
  loggedInUser: { role: 'admin' | 'colaborador'; username: string; name: string; codigo?: string } | null;
  onLogin: (user: { role: 'admin' | 'colaborador'; username: string; name: string; codigo: string }) => void;
  onLogout: () => void;
}

export default function AdminPanel({
  tenant,
  tenants,
  onSelectTenant,
  onUpdateTenant,
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  orders,
  onUpdateOrderStatus,
  collaborators,
  onAddCollaborator,
  onDeleteCollaborator,
  onUpdateCollaborator,
  notifications,
  onClearNotifications,
  onDeleteHistory,
  onTogglePreviewMode,
  isLoggedIn,
  loggedInUser,
  onLogin,
  onLogout
}: AdminPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Custom toast notifications for admin actions
  const [adminToast, setAdminToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Helper to show temporary feedback toast
  const showAdminToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  };

  const [loginRole, setLoginRole] = useState<'admin' | 'colaborador'>('admin');
  const [licenseInput, setLicenseInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Ingreso biométrico (huella / Face ID) en este dispositivo
  const [bioAvail, setBioAvail] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioCheck, setBioCheck] = useState(false);

  useEffect(() => {
    bioSupported().then(setBioAvail);
    setBioOn(bioEnabled());
  }, []);

  // Habilita el botón "Eliminar Historial" recién después de bajar el Excel
  const [historialDescargado, setHistorialDescargado] = useState(false);

  // --- COLLABORATORS FORM STATE ---
  const [colabName, setColabName] = useState('');
  const [colabUser, setColabUser] = useState('');
  const [colabPass, setColabPass] = useState('');
  const [colabPhone, setColabPhone] = useState('');
  const [editingColab, setEditingColab] = useState<Collaborator | null>(null);

  // Product CRUD Form state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Jabones Líquidos');
  // Categorías que el dueño agrega manualmente con el botón "+"
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  // Categorías (sin productos) que el dueño decidió ocultar con el botón 🗑
  const [removedCategories, setRemovedCategories] = useState<string[]>([]);

  // Lista completa de categorías: base + las de productos ya cargados + las nuevas.
  // Una categoría oculta reaparece si algún producto vuelve a usarla.
  const categoryOptions = useMemo(() => {
    const base = ['Jabones Líquidos', 'Desodorantes y Aromatizantes', 'Limpiadores Generales', 'Lavandería'];
    const fromProducts = products.map(p => p.category).filter(Boolean);
    return Array.from(new Set([...base, ...fromProducts, ...extraCategories]))
      .filter(c => !(removedCategories.includes(c) && !fromProducts.includes(c)));
  }, [products, extraCategories, removedCategories]);

  const handleAddCategory = () => {
    const name = (window.prompt('Escribí el nombre de la nueva categoría:') || '').trim();
    if (!name) return;
    setRemovedCategories(prev => prev.filter(c => c !== name));
    if (!categoryOptions.includes(name)) setExtraCategories(prev => [...prev, name]);
    setProdCategory(name);
  };

  const handleRemoveCategory = () => {
    const cat = prodCategory;
    if (!cat) return;
    const enUso = products.filter(p => p.category === cat).length;
    if (enUso > 0) {
      showAdminToast(`No podés quitar «${cat}»: tiene ${enUso} producto(s). Cambiáles la categoría primero.`, 'error');
      return;
    }
    setExtraCategories(prev => prev.filter(c => c !== cat));
    setRemovedCategories(prev => (prev.includes(cat) ? prev : [...prev, cat]));
    const rest = categoryOptions.filter(c => c !== cat);
    setProdCategory(rest[0] || '');
    showAdminToast(`Categoría «${cat}» quitada.`, 'success');
  };

  // ── Unidades de medida configurables (mismo patrón que categorías) ────
  const [extraUnits, setExtraUnits] = useState<string[]>([]);
  const [removedUnits, setRemovedUnits] = useState<string[]>([]);

  const unitOptions = useMemo(() => {
    const base = ['Litro', '5 Litros', '500ml', 'Unidad'];
    const fromProducts = products.map(p => p.unit).filter(Boolean);
    return Array.from(new Set([...base, ...fromProducts, ...extraUnits]))
      .filter(u => !(removedUnits.includes(u) && !fromProducts.includes(u)));
  }, [products, extraUnits, removedUnits]);

  const handleAddUnit = () => {
    const name = (window.prompt('Escribí la nueva unidad de medida (ej. Kg, 250ml, Docena):') || '').trim();
    if (!name) return;
    setRemovedUnits(prev => prev.filter(u => u !== name));
    if (!unitOptions.includes(name)) setExtraUnits(prev => [...prev, name]);
    setProdUnit(name);
  };

  const handleRemoveUnit = () => {
    const u = prodUnit;
    if (!u) return;
    const enUso = products.filter(p => p.unit === u).length;
    if (enUso > 0) {
      showAdminToast(`No podés quitar «${u}»: tiene ${enUso} producto(s). Cambiáles la unidad primero.`, 'error');
      return;
    }
    setExtraUnits(prev => prev.filter(x => x !== u));
    setRemovedUnits(prev => (prev.includes(u) ? prev : [...prev, u]));
    const rest = unitOptions.filter(x => x !== u);
    setProdUnit(rest[0] || '');
    showAdminToast(`Unidad «${u}» quitada.`, 'success');
  };
  const [prodPrice, setProdPrice] = useState(0);
  const [prodStock, setProdStock] = useState(10);
  const [prodUnit, setProdUnit] = useState('Litro');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImg, setProdImg] = useState('');
  const [prodIsPromo, setProdIsPromo] = useState(false);
  const [prodPromoPrice, setProdPromoPrice] = useState(0);
  const [prodCustomFields, setProdCustomFields] = useState<Array<{ key: string; value: string }>>([]);

  // Search filters
  const [productSearch, setProductSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Branding Customization fields
  const [brandTheme, setBrandTheme] = useState(tenant.customization.theme);
  const [brandFont, setBrandFont] = useState(tenant.customization.fontFamily);
  const [brandSlogan, setBrandSlogan] = useState(tenant.customization.welcomeSlogan);
  const [brandAbout, setBrandAbout] = useState(tenant.customization.aboutText);
  const [brandLogo, setBrandLogo] = useState(tenant.customization.logoUrl || '');
  const [brandHeaderName, setBrandHeaderName] = useState(tenant.name);
  const [brandMapUrl, setBrandMapUrl] = useState(tenant.customization.mapUrl || '');

  // Synchronize state when tenant updates
  useEffect(() => {
    setBrandTheme(tenant.customization.theme);
    setBrandFont(tenant.customization.fontFamily);
    setBrandSlogan(tenant.customization.welcomeSlogan);
    setBrandAbout(tenant.customization.aboutText);
    setBrandLogo(tenant.customization.logoUrl || '');
    setBrandHeaderName(tenant.name);
    setBrandMapUrl(tenant.customization.mapUrl || '');
  }, [tenant]);

  // Notifications bell toggle
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Auto-cierre del panel de notificaciones a los 3 segundos de abrirlo
  const notifTimeoutRef = useRef<any>(null);

  const startNotifTimer = useCallback(() => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
    }
    notifTimeoutRef.current = setTimeout(() => {
      setIsNotifOpen(false);
    }, 3000);
  }, []);

  const clearNotifTimer = useCallback(() => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
      notifTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isNotifOpen) {
      startNotifTimer();
    } else {
      clearNotifTimer();
    }
    return () => {
      if (notifTimeoutRef.current) {
        clearTimeout(notifTimeoutRef.current);
      }
    };
  }, [isNotifOpen, startNotifTimer, clearNotifTimer]);

  // CSV Export Modal / PDF Export modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Admin Theme Selection
  const adminThemeClass = useMemo(() => {
    switch (tenant.adminTheme) {
      case 'slate-dark':
        return 'bg-slate-900 text-slate-100 min-h-screen';
      case 'emerald':
        return 'bg-emerald-950 text-emerald-50 min-h-screen';
      case 'light':
      default:
        return 'bg-slate-50 text-slate-800 min-h-screen';
    }
  }, [tenant.adminTheme]);

  // Compute stats for current tenant
  const tenantProducts = useMemo(() => {
    return products.filter(p => p.tenantId === tenant.id);
  }, [products, tenant.id]);

  const tenantOrders = useMemo(() => {
    return orders.filter(o => o.tenantId === tenant.id);
  }, [orders, tenant.id]);

  const tenantClients = useMemo(() => {
    return []; // Removed clients CRM tab - no longer needed
  }, []);

  const pendingOrders = useMemo(() => {
    return tenantOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  }, [tenantOrders]);

  const completedOrders = useMemo(() => {
    return tenantOrders.filter(o => o.status === 'completed');
  }, [tenantOrders]);

  // Dashboard Metrics — cuentan TODOS los pedidos activos (no cancelados),
  // así un encargo nuevo se ve al instante.
  const ventasOrders = useMemo(() => {
    return tenantOrders.filter(o => o.status !== 'cancelled');
  }, [tenantOrders]);

  const totalRevenue = useMemo(() => {
    return ventasOrders.reduce((acc, curr) => acc + curr.total, 0);
  }, [ventasOrders]);

  const averageOrderValue = useMemo(() => {
    if (ventasOrders.length === 0) return 0;
    return Math.round(totalRevenue / ventasOrders.length);
  }, [ventasOrders, totalRevenue]);

  // Ventas de la semana (Lun→Dom) con datos reales (sin relleno)
  const weeklySalesData = useMemo(() => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const values = [0, 0, 0, 0, 0, 0, 0];
    ventasOrders.forEach(order => {
      const date = new Date(order.createdAt);
      const dayIndex = (date.getDay() + 6) % 7; // Lun=0 … Dom=6
      values[dayIndex] += order.total;
    });
    return days.map((day, i) => ({ day, sales: values[i] }));
  }, [ventasOrders]);

  // Tendencia de los últimos 6 meses reales, terminando en el mes actual
  const monthlySalesData = useMemo(() => {
    const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const buckets: { y: number; m: number; month: string; sales: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      buckets.push({ y: d.getFullYear(), m: d.getMonth(), month: nombres[d.getMonth()], sales: 0 });
    }
    ventasOrders.forEach(order => {
      const date = new Date(order.createdAt);
      const b = buckets.find(bk => bk.y === date.getFullYear() && bk.m === date.getMonth());
      if (b) b.sales += order.total;
    });
    return buckets.map(b => ({ month: b.month, sales: b.sales }));
  }, [ventasOrders]);

  // Filter lists based on searches
  const filteredProducts = useMemo(() => {
    return tenantProducts.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [tenantProducts, productSearch]);

  const filteredOrders = useMemo(() => {
    return pendingOrders.filter(o => 
      o.code.toLowerCase().includes(orderSearch.toLowerCase()) || 
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase())
    );
  }, [pendingOrders, orderSearch]);

  const filteredHistory = useMemo(() => {
    return completedOrders.filter(o => 
      o.code.toLowerCase().includes(orderSearch.toLowerCase()) || 
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase())
    );
  }, [completedOrders, orderSearch]);

  const filteredClients = useMemo(() => {
    return [];
  }, []);

  const activeNotifs = useMemo(() => {
    return notifications.filter(n => n.tenantId === tenant.id);
  }, [notifications, tenant.id]);

  // CRUD product handlings
  const handleOpenProductModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name);
      setProdCategory(product.category);
      setProdPrice(product.price);
      setProdStock(product.stock);
      setProdUnit(product.unit);
      setProdDesc(product.description);
      setProdImg(product.imageUrl);
      setProdIsPromo(product.isPromo);
      setProdPromoPrice(product.promoPrice || 0);
      setProdCustomFields(product.customFields || []);
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdCategory('Jabones Líquidos');
      setProdPrice(0);
      setProdStock(10);
      setProdUnit('Litro');
      setProdDesc('');
      setProdImg('https://images.unsplash.com/photo-1607006342411-9240dbb08c90?w=400');
      setProdIsPromo(false);
      setProdPromoPrice(0);
      setProdCustomFields([]);
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || prodPrice <= 0) {
      showAdminToast('Por favor complete el nombre y precio del producto.', 'error');
      return;
    }

    if (editingProduct) {
      onEditProduct({
        ...editingProduct,
        name: prodName,
        category: prodCategory,
        price: Number(prodPrice),
        stock: Number(prodStock),
        unit: prodUnit,
        description: prodDesc,
        imageUrl: prodImg || 'https://images.unsplash.com/photo-1607006342411-9240dbb08c90?w=400',
        isPromo: prodIsPromo,
        promoPrice: prodIsPromo ? Number(prodPromoPrice) : undefined,
        customFields: prodCustomFields
      });
    } else {
      onAddProduct({
        tenantId: tenant.id,
        name: prodName,
        category: prodCategory,
        price: Number(prodPrice),
        stock: Number(prodStock),
        unit: prodUnit,
        description: prodDesc,
        imageUrl: prodImg || 'https://images.unsplash.com/photo-1607006342411-9240dbb08c90?w=400',
        isPromo: prodIsPromo,
        promoPrice: prodIsPromo ? Number(prodPromoPrice) : undefined,
        customFields: prodCustomFields
      });
    }

    setIsProductModalOpen(false);
  };

  // Login real reutilizable (formulario y huella)
  const doLogin = async (codigo: string, usuario: string, pass: string, role: 'admin' | 'colaborador') => {
    const lic = await validarLicencia(codigo);
    if (!lic) return { ok: false, msg: 'Licencia inválida, inexistente o vencida.' };
    const res = role === 'admin'
      ? await asegurarCuentaSeguraDueno(usuario, pass, codigo)
      : await asegurarCuentaSeguraColab(usuario, pass, codigo);
    if (!res.ok) return { ok: false, msg: res.msg || 'No se pudo iniciar sesión.' };
    return { ok: true };
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const codigo = licenseInput.trim().toUpperCase();
    const usuario = usernameInput.trim();
    const pass = passwordInput;

    if (!codigo || !usuario || !pass) {
      setLoginError('Completá licencia, usuario y contraseña.');
      return;
    }

    setLoginLoading(true);
    try {
      const r = await doLogin(codigo, usuario, pass, loginRole);
      if (!r.ok) {
        setLoginError(r.msg || 'No se pudo iniciar sesión.');
        return;
      }

      // Si tildó "activar huella", la registramos en este equipo
      if (bioCheck && bioAvail) {
        try {
          await bioEnable({ codigo, usuario, password: pass, role: loginRole });
          setBioOn(true);
        } catch (e) { /* si la huella falla, igual entra */ }
      }

      onLogin({ role: loginRole, username: usuario, name: usuario, codigo });
      if (loginRole === 'colaborador') setActiveTab('orders');
    } catch (err: any) {
      setLoginError('Error de conexión: ' + (err?.message || err));
    } finally {
      setLoginLoading(false);
    }
  };

  // Ingreso con huella / Face ID: recupera las credenciales guardadas y loguea
  const handleBioLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const creds = await bioLogin();
      if (!creds) {
        setLoginError('No se pudo leer la huella. Ingresá con tus datos.');
        return;
      }
      const r = await doLogin(creds.codigo, creds.usuario, creds.password, creds.role);
      if (!r.ok) {
        setLoginError((r.msg || 'No se pudo entrar') + ' — volvé a ingresar tus datos.');
        return;
      }
      onLogin({ role: creds.role, username: creds.usuario, name: creds.usuario, codigo: creds.codigo });
      if (creds.role === 'colaborador') setActiveTab('orders');
    } catch (err: any) {
      setLoginError('Huella cancelada o no disponible en este dispositivo.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Branding customization save
  const handleSaveBranding = () => {
    onUpdateTenant({
      ...tenant,
      name: brandHeaderName,
      customization: {
        theme: brandTheme,
        fontFamily: brandFont,
        welcomeSlogan: brandSlogan,
        aboutText: brandAbout,
        logoUrl: brandLogo,
        primaryColor: tenant.customization.primaryColor,
        secondaryColor: tenant.customization.secondaryColor,
        mapUrl: brandMapUrl
      }
    });
    showAdminToast('¡Personalización de la página pública guardada con éxito!', 'success');
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    const headers = 'Código;Cliente;Teléfono;Artículos;Total;Modalidad;Estado;Atendido por;Rol;Fecha\n';
    const rows = tenantOrders.map(o => {
      const itemsString = o.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
      const dateStr = new Date(o.createdAt).toLocaleDateString();
      return `${o.code};${o.customerName};${o.customerPhone};"${itemsString}";$${o.total};${o.deliveryType === 'delivery' ? 'Envío' : 'Retiro'};${o.status};${o.atendidoPor || ''};${o.atendidoPorRol || ''};${dateStr}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Ventas_${tenant.subdomain}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setHistorialDescargado(true);
    showAdminToast('Planilla Excel descargada. Ya podés eliminar el historial si querés.', 'success');
  };

  // Print highly styled order summary acting as PDF invoice
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAdminToast('Por favor habilite las ventanas emergentes para descargar el PDF de impresión.', 'info');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Reporte de Ventas - ${tenant.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 40px; }
            .header { border-b: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; color: #10b981; font-size: 24px; }
            .meta { font-size: 12px; color: #666; text-align: right; }
            .kpis { display: flex; gap: 20px; margin-bottom: 30px; }
            .kpi-card { border: 1px solid #eaeaea; border-radius: 8px; padding: 15px; flex: 1; text-align: center; background: #fafafa; }
            .kpi-num { font-size: 20px; font-weight: bold; color: #111; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #eaeaea; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fbfbfb; }
            .footer { margin-top: 50px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eaeaea; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${tenant.name}</h1>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Reporte Consolidado de Ventas Químicas</p>
            </div>
            <div class="meta">
              <p>Generado: ${new Date().toLocaleString()}</p>
              <p>Inquilino ID: ${tenant.id}</p>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div style="font-size: 12px; color: #666;">Facturación Total</div>
              <div class="kpi-num">$${totalRevenue.toLocaleString()}</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 12px; color: #666;">Pedidos Completados</div>
              <div class="kpi-num">${completedOrders.length}</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 12px; color: #666;">Ticket Promedio</div>
              <div class="kpi-num">$${averageOrderValue.toLocaleString()}</div>
            </div>
          </div>

          <h3>Listado Completo de Transacciones</h3>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Monto Total</th>
                <th>Tipo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${completedOrders.map(o => `
                <tr>
                  <td><strong>${o.code}</strong></td>
                  <td>${o.customerName}</td>
                  <td>${o.customerPhone}</td>
                  <td>$${o.total}</td>
                  <td>${o.deliveryType === 'delivery' ? 'Envío' : 'Retiro en Local'}</td>
                  <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Este documento representa una planilla de cálculo contable y reporte de ventas oficial de la plataforma PWA Multi-Inquilino.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10">
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Consola de Administración</h1>
            <p className="text-xs text-slate-400">Acceso exclusivo para comerciantes y colaboradores autorizados</p>
          </div>

          {/* Ingreso rápido con huella / Face ID (si está activado en este equipo) */}
          {bioAvail && bioOn && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleBioLogin}
                disabled={loginLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" /> Ingresar con huella / Face ID
              </button>
              <div className="flex items-center gap-2 my-3">
                <span className="flex-1 h-px bg-slate-800"></span>
                <span className="text-[10px] text-slate-500 uppercase">o con tus datos</span>
                <span className="flex-1 h-px bg-slate-800"></span>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Role select tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setLoginRole('admin');
                  setLoginError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  loginRole === 'admin' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏭 Dueño
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRole('colaborador');
                  setLoginError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  loginRole === 'colaborador' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👥 Colaborador
              </button>
            </div>

            {/* License input field */}
            <div className="space-y-1">
              <label htmlFor="login-license" className="text-[11px] font-semibold text-slate-400 block">
                Licencia del Comercio *
              </label>
              <input
                id="login-license"
                type="text"
                required
                placeholder="Ej. QUIM-XXXX-...."
                value={licenseInput}
                onChange={(e) => {
                  setLicenseInput(e.target.value);
                  setLoginError('');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none uppercase font-mono"
              />
            </div>

            {/* Credentials fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="login-user" className="text-[11px] font-semibold text-slate-400 block">Usuario *</label>
                <input
                  id="login-user"
                  type="text"
                  required
                  placeholder="Ej. admin"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-medium"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="login-pass" className="text-[11px] font-semibold text-slate-400 block">Contraseña *</label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-[11px] font-bold text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/30 animate-fade-in leading-normal">
                ⚠️ {loginError}
              </p>
            )}

            {/* Activar huella en este equipo */}
            {bioAvail && !bioOn && (
              <label className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bioCheck}
                  onChange={(e) => setBioCheck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600"
                />
                <span>
                  🔒 <strong className="text-slate-200">Activar ingreso con huella / Face ID</strong> en este dispositivo,
                  para no volver a tipear las credenciales.
                </span>
              </label>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              {loginLoading
                ? (<><span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin"></span> Verificando…</>)
                : '✓ Autenticar y Entrar'}
            </button>
          </form>

          {/* Guide Helper Desk */}
          <div className="mt-6 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1.5 leading-normal">
            <div className="font-bold text-indigo-400">🔐 Acceso seguro</div>
            <div className="leading-relaxed">
              Ingresá el <strong className="text-slate-300">código de licencia</strong> de tu comercio (empieza con
              <code className="text-white bg-slate-800 px-1 py-0.5 rounded mx-1">QUIM-</code>) y creá o usá tu
              usuario y contraseña de <strong className="text-slate-300">Dueño</strong>. Los dos dueños entran con la
              misma licencia y distinto usuario. La contraseña debe tener 6 caracteres o más.
            </div>
            <div className="border-t border-slate-800 pt-1.5">
              👥 El <strong className="text-slate-300">Colaborador</strong> ingresa con la misma licencia y las
              credenciales que le cargó el dueño desde el panel.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${adminThemeClass} transition-colors duration-300 font-sans`}>
      
      {/* 1. ADMIN HEADER BAR */}
      <header className="bg-slate-900 text-slate-100 py-3.5 px-6 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                Consola de Administración
              </h2>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                loggedInUser?.role === 'admin' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/30' : 'bg-amber-950 text-amber-300 border border-amber-900/30'
              }`}>
                {loggedInUser?.role === 'admin' ? '⚙️ Admin' : '👤 Colaborador'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-indigo-300/80 font-medium">
              Gestión Interna / {tenant.name}
            </p>
          </div>
        </div>

        {/* Action bell, logged user & logout */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200">{loggedInUser?.name}</span>
            <span className="text-[9px] text-slate-500 font-mono">@{loggedInUser?.username}</span>
          </div>

          <div className="relative">
            <button
              id="admin-bell-notification-toggle"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 relative transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {activeNotifs.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 text-[10px] text-white font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                  {activeNotifs.length}
                </span>
              )}
            </button>

            {/* Notification drop drawer */}
            {isNotifOpen && (
              <div
                className="absolute right-0 mt-3.5 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-40 text-slate-200 overflow-hidden"
              >
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Mensajes de Alerta</span>
                  <button 
                    onClick={onClearNotifications}
                    className="text-[10px] text-slate-400 hover:text-slate-200 font-medium"
                  >
                    Borrar Todo
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800">
                  {activeNotifs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Sin novedades por el momento.
                    </div>
                  ) : (
                    activeNotifs.map(n => (
                      <div key={n.id} className="p-3 text-xs hover:bg-slate-900 transition-colors">
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-slate-200">{n.title}</span>
                          <span className="text-[9px] text-slate-500">Recién</span>
                        </div>
                        <p className="text-slate-400 mt-1 leading-normal">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick PDF trigger */}
          <button
            onClick={handlePrintPDF}
            title="Descargar Planilla PDF de Ventas"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          {/* New Casita/Home Preview button */}
          <button
            onClick={() => {
              if (onTogglePreviewMode) onTogglePreviewMode();
            }}
            title="Ver Página Pública (Modo de Vista Previa Limpia)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold border border-indigo-500 shadow-sm cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Tienda</span>
          </button>

          {/* Logout button */}
          <button
            onClick={() => {
              onLogout();
            }}
            title="Cerrar Sesión"
            className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg border border-red-900/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. ADMIN CONTROL TABS / ACTION SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Menu Sidebar navigation */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/10 p-3 rounded-2xl border border-slate-200/20 backdrop-blur-sm space-y-1">
              {loggedInUser?.role === 'admin' && (
                <button
                  id="btn-tab-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Control de Ventas (Dashboard)
                </button>
              )}

              <button
                id="btn-tab-products"
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all ${
                  activeTab === 'products'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Layers className="w-4 h-4" />
                Inventario de Productos
              </button>

              <button
                id="btn-tab-orders"
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all relative ${
                  activeTab === 'orders'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Pedidos Pendientes
                {pendingOrders.length > 0 && (
                  <span className="absolute right-3 bg-red-500 text-[10px] text-white px-1.5 py-0.2 rounded-full font-bold">
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <button
                id="btn-tab-history"
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <History className="w-4 h-4" />
                Historial de Ventas
              </button>

              {loggedInUser?.role === 'admin' && (
                <>
                  <button
                    id="btn-tab-customization"
                    onClick={() => setActiveTab('customization')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all ${
                      activeTab === 'customization'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    Pestaña Página Pública
                  </button>

                  <button
                    id="btn-tab-collaborators"
                    onClick={() => setActiveTab('collaborators')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all ${
                      activeTab === 'collaborators'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Agregar Colaborador
                  </button>

                  <button
                    id="btn-tab-settings"
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all ${
                      activeTab === 'settings'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Configuración General
                  </button>
                </>
              )}

              <div className="border-t border-slate-800/60 my-2 pt-2"></div>
              
              <button
                id="btn-tab-logout-sidebar"
                onClick={() => {
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left cursor-pointer transition-all text-red-400 hover:text-red-300 hover:bg-red-950/20"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* Core Content Zone */}
          <div className="lg:col-span-9 bg-slate-900/50 p-6 rounded-3xl border border-slate-200/10 backdrop-blur-md">
            
            {/* --- TAB 1: DASHBOARD (solo Dueño) --- */}
            {activeTab === 'dashboard' && loggedInUser?.role === 'admin' && (
              <div className="space-y-6">

                {/* Stats KPIs cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Facturación Consolidada</span>
                    <h3 className="text-xl font-black mt-1 text-slate-100">
                      ${totalRevenue.toLocaleString('es-AR')}
                    </h3>
                    <p className="text-[10px] text-emerald-400 mt-1">✓ En tiempo real</p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pedidos</span>
                    <h3 className="text-xl font-black mt-1 text-slate-100">
                      {tenantOrders.length}
                    </h3>
                    <p className="text-[10px] text-amber-400 mt-1">
                      {pendingOrders.length} pendiente{pendingOrders.length === 1 ? '' : 's'} · {completedOrders.length} concluido{completedOrders.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ticket Promedio</span>
                    <h3 className="text-xl font-black mt-1 text-slate-100">
                      ${averageOrderValue.toLocaleString('es-AR')}
                    </h3>
                    <p className="text-[10px] text-indigo-400 mt-1">Por cada compra</p>
                  </div>
                </div>

                {/* Dashboard Sales Charts (High fidelity custom responsive SVGs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Weekly Sales Chart */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-300">Ventas de la Semana (Día x Día)</span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Pesos ARG</span>
                    </div>

                    {/* SVG Chart Drawing */}
                    <div className="h-44 w-full flex items-end justify-between pt-4 px-2">
                      {weeklySalesData.map((data, index) => {
                        const maxSales = Math.max(...weeklySalesData.map(d => d.sales)) || 1;
                        const heightPercent = (data.sales / maxSales) * 100;
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-[10px] text-white px-2 py-1 rounded shadow-lg pointer-events-none z-10 font-bold">
                              ${data.sales.toLocaleString()}
                            </div>
                            
                            {/* Bar segment */}
                            <div className="w-6 sm:w-8 bg-indigo-500 hover:bg-indigo-400 rounded-t-md transition-all relative overflow-hidden" style={{ height: `${Math.max(8, heightPercent)}%` }}>
                              <div className="absolute top-0 inset-x-0 h-1/2 bg-white/10"></div>
                            </div>

                            <span className="text-[10px] text-slate-500 mt-2 font-medium">
                              {data.day.substring(0, 2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monthly Sales Trend */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-300">Tendencia Mensual (Historial)</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Semestral</span>
                    </div>

                    {/* SVG Trend Area Line Drawing */}
                    <div className="h-44 w-full relative pt-4">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Compute coordinates */}
                        {/* We have 6 values in monthlySalesData: Ene, Feb, Mar, Abr, May, Jun */}
                        {/* x spaced from 10 to 290. y based on values */}
                        {(() => {
                          const maxVal = Math.max(...monthlySalesData.map(d => d.sales)) || 1;
                          const points = monthlySalesData.map((d, i) => {
                            const x = 10 + i * (280 / 5);
                            const y = 90 - (d.sales / maxVal) * 80;
                            return { x, y };
                          });

                          const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
                          const areaD = `${pathD} L ${points[points.length-1].x},90 L ${points[0].x},90 Z`;

                          return (
                            <>
                              {/* Horizontal helper grid lines */}
                              <line x1="0" y1="10" x2="300" y2="10" stroke="#1e293b" strokeDasharray="3 3" />
                              <line x1="0" y1="50" x2="300" y2="50" stroke="#1e293b" strokeDasharray="3 3" />
                              <line x1="0" y1="90" x2="300" y2="90" stroke="#1e293b" />

                              {/* Filled Area */}
                              <path d={areaD} fill="url(#gradient-area)" />
                              
                              {/* Line */}
                              <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                              {/* Nodes */}
                              {points.map((p, i) => (
                                <g key={i} className="group cursor-pointer">
                                  <circle cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="#042f1a" strokeWidth="1.5" />
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                      
                      {/* X Axis Labels */}
                      <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[10px] text-slate-500 font-medium">
                        {monthlySalesData.map((d, idx) => (
                          <span key={idx}>{d.month}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Direct Action triggers */}
                <div className="bg-indigo-600/10 p-4 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">¿Necesitas una Planilla de Ventas?</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Descarga el historial completo en formato CSV compatible con Excel y Numbers.</p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar CSV
                  </button>
                </div>

                {/* QR Code and Sharing Container */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/10 shadow-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <strong className="text-xs text-slate-200 block">Tu Código QR de Sucursal</strong>
                      <span className="text-[10px] text-slate-400">Compartí el catálogo digital para que tus clientes compren directamente en tu sucursal.</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                    {/* QR Image Wrapper */}
                    <div className="p-2.5 bg-white rounded-xl shadow-inner flex items-center justify-center shrink-0">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`)}`}
                        alt="QR Code" 
                        className="w-28 h-28"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* QR Info and share actions */}
                    <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                      <strong className="text-xs text-slate-300 block">Llegá a más clientes</strong>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Cualquier persona que escanee este código accederá instantáneamente a la versión pública de *{tenant.name}* donde podrá armar carritos y realizar pedidos.
                      </p>

                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                        {/* WhatsApp share */}
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`👋 ¡Hola! Te invito a visitar la tienda online de *${tenant.name}*. Podés ver nuestros productos, ofertas especiales y hacer tu pedido de forma rápida y sencilla desde aquí:\n\n🔗 ${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Compartir por WhatsApp</span>
                        </a>

                        {/* Copy URL trigger */}
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`;
                            navigator.clipboard.writeText(url);
                            showAdminToast('¡Enlace copiado al portapapeles!', 'success');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-750 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <span>Copiar Enlace</span>
                        </button>

                        {/* Download QR image trigger */}
                        <a
                          href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          <span>Descargar QR</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* --- TAB 2: PRODUCTS CRUD --- */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Administrador de Inventario</h3>
                    <p className="text-xs text-slate-400">Agrega, edita y gestiona el stock y ofertas de los productos químicos.</p>
                  </div>
                  
                  <button
                    id="btn-add-new-product"
                    onClick={() => handleOpenProductModal(null)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar Producto
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column - Product Management Table */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Search Bar */}
                    <input
                      id="product-admin-search"
                      type="text"
                      placeholder="🔍 Buscar productos por nombre o categoría..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {/* Table list */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Categoría</th>
                            <th className="p-3">Precio</th>
                            <th className="p-3">Stock</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredProducts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500">
                                Ningún producto coincide con la búsqueda.
                              </td>
                            </tr>
                          ) : (
                            filteredProducts.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                                <td className="p-3">
                                  <div className="flex items-center gap-2.5">
                                    <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover border border-slate-800" referrerPolicy="no-referrer" />
                                    <div>
                                      <span className="font-bold text-slate-100 block">{p.name}</span>
                                      <span className="text-[10px] text-slate-500">Unidad: {p.unit}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-slate-400">{p.category}</td>
                                <td className="p-3">
                                  {p.isPromo ? (
                                    <div>
                                      <span className="text-red-400 font-bold block">${p.promoPrice}</span>
                                      <span className="text-[9px] text-slate-500 line-through">${p.price}</span>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-slate-200">${p.price}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={`font-mono font-bold ${p.stock <= 5 ? 'text-red-400' : 'text-slate-300'}`}>
                                    {p.stock}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {p.stock <= 0 ? (
                                    <span className="px-2 py-0.5 bg-red-950 text-red-400 text-[10px] rounded-full font-bold border border-red-900/30">Sin Stock</span>
                                  ) : p.isPromo ? (
                                    <span className="px-2 py-0.5 bg-amber-950 text-amber-400 text-[10px] rounded-full font-bold border border-amber-900/30">Promoción</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded-full font-bold border border-emerald-900/30">Activo</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleOpenProductModal(p)}
                                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        showConfirm(
                                          'Eliminar Producto',
                                          `¿Está seguro de eliminar "${p.name}" del catálogo?`,
                                          () => {
                                            onDeleteProduct(p.id);
                                            showAdminToast('Producto eliminado con éxito', 'success');
                                          }
                                        );
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column - Live Miniature Smartphone Preview ("Negocio Chiquito") */}
                  <div className="lg:col-span-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">📱 Vista Previa del Negocio</span>
                      <p className="text-[9px] text-slate-500 mt-0.5">Asi luce tu comercio en celulares y tablets</p>
                    </div>

                    {/* Outer Phone Shell */}
                    <div className="border-[6px] border-slate-950 rounded-[32px] bg-slate-100 w-full max-w-[210px] mx-auto overflow-hidden text-slate-900 aspect-[9/17] relative shadow-2xl flex flex-col text-[9px] select-none font-sans">
                      {/* Notch camera */}
                      <div className="w-14 h-2.5 bg-slate-950 rounded-b-lg absolute top-0 left-1/2 -translate-x-1/2 z-10"></div>
                      
                      {/* Live Screen Area */}
                      <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 pt-3">
                        {/* Custom Header Preview */}
                        <div className={`p-2 text-center text-white ${
                          brandTheme === 'eco-green' ? 'bg-emerald-600' :
                          brandTheme === 'aqua-fresh' ? 'bg-sky-600' :
                          brandTheme === 'lavender-dream' ? 'bg-violet-600' :
                          brandTheme === 'amber-warm' ? 'bg-amber-600' :
                          'bg-slate-700'
                        }`}>
                          <span className="text-[10px] font-black block tracking-tight truncate">{tenant.name}</span>
                          <span className="text-[7px] opacity-90 block italic truncate mt-0.5">{brandSlogan || 'Venta de productos químicos'}</span>
                        </div>

                        {/* Banner preview */}
                        <div className="p-1 bg-slate-100 text-center border-b border-slate-200">
                          <span className="text-[7px] font-bold text-indigo-600 uppercase tracking-widest">✨ Ofertas Destacadas</span>
                        </div>

                        {/* Smartphone list products */}
                        <div className="p-1.5 space-y-2 flex-1 overflow-y-auto">
                          {tenantProducts.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-[8px] italic">
                              Carga productos para verlos aquí
                            </div>
                          ) : (
                            tenantProducts.map(p => (
                              <div key={p.id} className="bg-white p-1.5 rounded-lg shadow-xs border border-slate-200 space-y-1">
                                <div className="flex gap-1.5">
                                  <img src={p.imageUrl} alt="" className="w-5 h-5 rounded object-cover" referrerPolicy="no-referrer" />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-slate-800 block truncate text-[8px]">{p.name}</span>
                                    <span className="text-[7px] text-slate-500 block truncate">{p.category} · {p.unit}</span>
                                  </div>
                                </div>

                                {/* Custom fields list inside live smartphone mock */}
                                {p.customFields && p.customFields.length > 0 && (
                                  <div className="bg-slate-50 p-1 rounded text-[6px] text-slate-600 space-y-0.5 border border-slate-100">
                                    {p.customFields.map((cf, idx) => (
                                      <div key={idx} className="flex justify-between truncate">
                                        <span className="font-medium text-slate-500">{cf.key}:</span>
                                        <span className="font-bold text-slate-700">{cf.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-0.5 border-t border-slate-100">
                                  <span className="font-black text-indigo-600 text-[8px]">
                                    ${p.isPromo && p.promoPrice ? p.promoPrice : p.price}
                                  </span>
                                  <button type="button" disabled className="px-1 bg-indigo-50 text-indigo-600 rounded text-[6px] font-bold border border-indigo-100">
                                    + Canasto
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Bottom basket floating indicator */}
                        <div className="p-1.5 bg-indigo-600 text-white text-center font-bold text-[7px] flex items-center justify-between shadow-lg mt-auto">
                          <span>🛒 Canasto de Artículos</span>
                          <span className="bg-white text-indigo-600 px-1 py-0.2 rounded-full text-[6px] font-black">
                            {tenantProducts.length} ítems
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 3: PENDING ORDERS --- */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Pedidos Recibidos Pendientes</h3>
                  <p className="text-xs text-slate-400">Prepara y despacha los pedidos de los compradores desde este control.</p>
                </div>

                <input
                  id="order-admin-search"
                  type="text"
                  placeholder="🔍 Buscar por código de retiro o nombre del cliente..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                />

                <div className="space-y-3">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs">
                      No hay pedidos pendientes para este comercio.
                    </div>
                  ) : (
                    filteredOrders.map((o) => (
                      <div key={o.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-indigo-400 tracking-wider">
                              {o.code}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] rounded-md font-bold uppercase ${
                              o.status === 'pending' ? 'bg-red-950 text-red-400 border border-red-900/20' :
                              o.status === 'preparing' ? 'bg-amber-950 text-amber-400 border border-amber-900/20' :
                              'bg-blue-950 text-blue-400 border border-blue-900/20'
                            }`}>
                              {o.status === 'pending' ? 'Pendiente' :
                               o.status === 'preparing' ? 'Preparando' :
                               'Listo / Enviado'}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-500 font-medium">
                            Fecha: {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Customer details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Comprador:</span>
                            <strong className="text-slate-300">{o.customerName}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Teléfono / Celular:</span>
                            <a href={`tel:${o.customerPhone}`} className="text-indigo-400 font-bold hover:underline">
                              {o.customerPhone}
                            </a>
                          </div>
                        </div>

                        {/* Items listed */}
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">Artículos del Pedido</span>
                          {o.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="text-slate-300">{it.name} <strong className="text-indigo-400">x{it.quantity}</strong></span>
                              <span className="font-mono text-slate-400">${it.price * it.quantity}</span>
                            </div>
                          ))}
                          <div className="border-t border-slate-800 pt-1 mt-1 flex justify-between font-bold">
                            <span className="text-slate-400">Total a Cobrar:</span>
                            <span className="text-slate-200">${o.total}</span>
                          </div>
                        </div>

                        {/* Delivery type info */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          {o.deliveryType === 'delivery' ? (
                            <>
                              <Truck className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                              <span>Modalidad: <strong>Envío a Domicilio</strong></span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Modalidad: <strong>Retiro por Sucursal</strong></span>
                            </>
                          )}
                        </div>

                        {/* Status Transition controls */}
                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800/50 pt-2">
                          {o.status === 'pending' && (
                            <button
                              onClick={() => onUpdateOrderStatus(o.id, 'preparing')}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              ⚙ Marcar como Preparando
                            </button>
                          )}
                          {o.status === 'preparing' && (
                            <button
                              onClick={() => onUpdateOrderStatus(o.id, 'ready_or_shipped')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              📦 Listo para retirar / Enviar
                            </button>
                          )}
                          {(o.status === 'ready_or_shipped' || o.status === 'preparing') && (
                            <button
                              onClick={() => onUpdateOrderStatus(o.id, 'completed')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              ✓ Entregar y Completar Venta
                            </button>
                          )}
                          <button
                            onClick={() => {
                              showConfirm(
                                'Cancelar Pedido',
                                `¿Desea cancelar el pedido ${o.code} de ${o.customerName}?`,
                                () => {
                                  onUpdateOrderStatus(o.id, 'cancelled');
                                  showAdminToast('Pedido cancelado con éxito', 'info');
                                }
                              );
                            }}
                            className="px-2.5 py-1.5 bg-red-950 text-red-400 border border-red-900/30 rounded-lg text-[11px] font-semibold hover:bg-red-900/30 cursor-pointer"
                          >
                            X Cancelar
                          </button>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* --- TAB 4: HISTORY --- */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Historial de Ventas Concluidas</h3>
                    <p className="text-xs text-slate-400">Verifica la facturación, los códigos entregados y exporta reportes.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintPDF}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-400" /> Descargar PDF
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" /> Planilla Excel
                    </button>
                    <button
                      onClick={() => {
                        if (!historialDescargado) return;
                        showConfirm(
                          'Eliminar historial de ventas',
                          'Se van a borrar todas las ventas concluidas de forma permanente. Ya descargaste la planilla, así que tenés el respaldo. ¿Continuar?',
                          () => {
                            onDeleteHistory && onDeleteHistory();
                            setHistorialDescargado(false);
                            showAdminToast('Historial de ventas eliminado.', 'success');
                          }
                        );
                      }}
                      disabled={!historialDescargado}
                      title={historialDescargado ? 'Eliminar historial de ventas' : 'Primero descargá la Planilla Excel'}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                        historialDescargado
                          ? 'bg-red-950 hover:bg-red-900 text-red-300 border-red-900/40'
                          : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar Historial
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Código</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Método</th>
                        <th className="p-3">Monto Cobrado</th>
                        <th className="p-3">Atendido por</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500">
                            Ninguna venta histórica registrada aún.
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-bold text-indigo-400">{o.code}</td>
                            <td className="p-3">
                              <div>
                                <span className="font-semibold block text-slate-200">{o.customerName}</span>
                                <span className="text-[10px] text-slate-500">{o.customerPhone}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-400">
                              {new Date(o.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-slate-300">
                              {o.deliveryType === 'delivery' ? '🚚 Envío' : '🏪 Sucursal'}
                            </td>
                            <td className="p-3 font-bold text-emerald-400">${o.total}</td>
                            <td className="p-3">
                              {o.atendidoPor ? (
                                <div>
                                  <span className="font-semibold block text-slate-200">{o.atendidoPor}</span>
                                  <span className={`text-[10px] font-bold ${o.atendidoPorRol === 'Dueño' ? 'text-indigo-400' : 'text-amber-400'}`}>
                                    {o.atendidoPorRol === 'Dueño' ? '⚙️ Dueño' : '👤 Vendedor'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded-full font-bold border border-emerald-900/30">
                                Completado
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- TAB 5: COLLABORATORS --- */}
            {activeTab === 'collaborators' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Personal de Trabajo (Colaboradores)</h3>
                  <p className="text-xs text-slate-400">Registra colaboradores independientes para que despachen pedidos y controlen stock en esta sucursal.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Register Form */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      {editingColab ? (
                        <>
                          <Edit className="w-4 h-4 text-amber-500 animate-pulse" />
                          <span>Editar Colaborador</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 text-indigo-400" />
                          <span>Registrar Nuevo Colaborador</span>
                        </>
                      )}
                    </h4>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label htmlFor="colab-reg-name" className="text-[11px] font-semibold text-slate-400 block">Nombre Completo *</label>
                        <input
                          id="colab-reg-name"
                          type="text"
                          placeholder="Ej. Gastón Pérez"
                          value={colabName}
                          onChange={(e) => setColabName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="colab-reg-user" className="text-[11px] font-semibold text-slate-400 block">Nombre de Usuario *</label>
                        <input
                          id="colab-reg-user"
                          type="text"
                          placeholder="Ej. gaston"
                          value={colabUser}
                          onChange={(e) => setColabUser(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="colab-reg-pass" className="text-[11px] font-semibold text-slate-400 block">Contraseña de Acceso *</label>
                        <input
                          id="colab-reg-pass"
                          type="text"
                          placeholder="Ej. 123"
                          value={colabPass}
                          onChange={(e) => setColabPass(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="colab-reg-phone" className="text-[11px] font-semibold text-slate-400 block">Teléfono de Contacto</label>
                        <input
                          id="colab-reg-phone"
                          type="text"
                          placeholder="Ej. +54 9 11 1234 5678"
                          value={colabPhone}
                          onChange={(e) => setColabPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    {editingColab ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!colabName.trim() || !colabUser.trim() || !colabPass.trim()) {
                              showAdminToast('Por favor complete todos los campos obligatorios.', 'error');
                              return;
                            }

                            // Check if username already exists in another collaborator of this tenant
                            const exists = collaborators.some(
                              c => c.tenantId === tenant.id && 
                              c.id !== editingColab.id && 
                              c.username.toLowerCase() === colabUser.toLowerCase()
                            );
                            if (exists) {
                              showAdminToast('Este nombre de usuario ya está registrado.', 'error');
                              return;
                            }

                            onUpdateCollaborator({
                              ...editingColab,
                              name: colabName,
                              username: colabUser.trim().toLowerCase(),
                              password: colabPass,
                              phone: colabPhone.trim()
                            });

                            setEditingColab(null);
                            setColabName('');
                            setColabUser('');
                            setColabPass('');
                            setColabPhone('');
                            showAdminToast('¡Colaborador actualizado con éxito!', 'success');
                          }}
                          className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          💾 Guardar Cambios
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColab(null);
                            setColabName('');
                            setColabUser('');
                            setColabPass('');
                            setColabPhone('');
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!colabName.trim() || !colabUser.trim() || !colabPass.trim()) {
                            showAdminToast('Por favor complete todos los campos obligatorios para el colaborador.', 'error');
                            return;
                          }
                          
                          // Check if username already exists in this tenant
                          const exists = collaborators.some(c => c.tenantId === tenant.id && c.username.toLowerCase() === colabUser.toLowerCase());
                          if (exists) {
                            showAdminToast('Este nombre de usuario ya está registrado en este comercio.', 'error');
                            return;
                          }

                          onAddCollaborator({
                            id: `colab-${Date.now()}`,
                            tenantId: tenant.id,
                            name: colabName,
                            username: colabUser.trim().toLowerCase(),
                            password: colabPass,
                            phone: colabPhone.trim(),
                            createdAt: new Date().toISOString()
                          });

                          setColabName('');
                          setColabUser('');
                          setColabPass('');
                          setColabPhone('');
                          showAdminToast('¡Colaborador registrado exitosamente!', 'success');
                        }}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        ➕ Registrar Colaborador
                      </button>
                    )}
                  </div>

                  {/* List of collaborators */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                      Colaboradores Registrados ({collaborators.filter(c => c.tenantId === tenant.id).length})
                    </h4>

                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {collaborators.filter(c => c.tenantId === tenant.id).length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          No hay colaboradores registrados para esta sucursal.
                        </div>
                      ) : (
                        collaborators.filter(c => c.tenantId === tenant.id).map(c => (
                          <div key={c.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div>
                              <strong className="text-xs text-slate-200 block">
                                {c.name}
                                {editingColab?.id === c.id && (
                                  <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                    Editando
                                  </span>
                                )}
                              </strong>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 mt-1 font-mono">
                                <span>Usuario: <strong className="text-slate-300">{c.username}</strong></span>
                                <span>Clave: <strong className="text-slate-300">{c.password}</strong></span>
                                {c.phone && (
                                  <span className="flex items-center gap-0.5 text-indigo-400">
                                    <Phone className="w-2.5 h-2.5 inline" /> 
                                    <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingColab(c);
                                  setColabName(c.name);
                                  setColabUser(c.username);
                                  setColabPass(c.password);
                                  setColabPhone(c.phone || '');
                                }}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition-all cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  showConfirm(
                                    'Dar de Baja Colaborador',
                                    `¿Desea dar de baja al colaborador ${c.name}?`,
                                    () => {
                                      if (editingColab?.id === c.id) {
                                        setEditingColab(null);
                                        setColabName('');
                                        setColabUser('');
                                        setColabPass('');
                                        setColabPhone('');
                                      }
                                      onDeleteCollaborator(c.id);
                                      showAdminToast('Colaborador dado de baja con éxito', 'info');
                                    }
                                  );
                                }}
                                className="p-1.5 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                                title="Dar de baja"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 6: BRANDING CUSTOMIZATION ("Pestaña especial para la página pública") --- */}
            {activeTab === 'customization' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Personalización de la Página Pública</h3>
                  <p className="text-xs text-slate-400">Modifica la apariencia, temas, tipos de letras y colores visibles para el comprador.</p>
                </div>

                <div className="space-y-4">
                  {/* Theme Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Tema Cromático de la Tienda:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {(['eco-green', 'aqua-fresh', 'lavender-dream', 'amber-warm', 'clean-neutral'] as const).map(th => (
                        <button
                          key={th}
                          type="button"
                          onClick={() => setBrandTheme(th)}
                          className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            brandTheme === th
                              ? 'border-indigo-500 bg-indigo-500/10 text-slate-100'
                              : 'border-slate-800 hover:bg-slate-800/40 text-slate-400'
                          }`}
                        >
                          <span className="block capitalize mb-1">
                            {th.replace('-', ' ')}
                          </span>
                          <span className="flex gap-1">
                            <span className={`w-3 h-3 rounded-full ${
                              th === 'eco-green' ? 'bg-emerald-500' :
                              th === 'aqua-fresh' ? 'bg-sky-500' :
                              th === 'lavender-dream' ? 'bg-violet-500' :
                              th === 'amber-warm' ? 'bg-amber-500' : 'bg-slate-600'
                            }`}></span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Tipo de Letra (Tipografía):</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['font-sans', 'font-display', 'font-mono'] as const).map(font => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => setBrandFont(font)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            brandFont === font
                              ? 'border-indigo-500 bg-indigo-500/10 text-slate-100'
                              : 'border-slate-800 hover:bg-slate-800/40 text-slate-400'
                          }`}
                        >
                          <span className={`block font-bold text-xs ${FONT_PRESETS[font]}`}>
                            {font === 'font-sans' ? 'Inter (Moderna/Legible)' :
                             font === 'font-display' ? 'Space Grotesk (Aesthetic)' :
                             'JetBrains Mono (Técnica)'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slogans and details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="brand-header-name" className="text-xs font-semibold text-slate-400 block">Nombre del Comercio (Encabezado) *</label>
                      <input
                        id="brand-header-name"
                        type="text"
                        value={brandHeaderName}
                        onChange={(e) => setBrandHeaderName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        placeholder="Ej. Eco-Quimica Argentina"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label htmlFor="brand-slogan" className="text-xs font-semibold text-slate-400 block">Eslogan de Bienvenida:</label>
                      <input
                        id="brand-slogan"
                        type="text"
                        value={brandSlogan}
                        onChange={(e) => setBrandSlogan(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        placeholder="Ej. Calidad y pureza en productos químicos"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 block">Logo de Comercio:</label>
                      <div className="flex gap-2">
                        <input
                          id="brand-logo"
                          type="text"
                          value={brandLogo}
                          onChange={(e) => setBrandLogo(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                          placeholder="URL del Logo o subí una imagen"
                        />
                        <label className="flex items-center justify-center shrink-0 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                          <UploadCloud className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setBrandLogo(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="brand-about" className="text-xs font-semibold text-slate-400 block">Descripción "Sobre Nosotros" de la Tienda:</label>
                    <textarea
                      id="brand-about"
                      rows={3}
                      value={brandAbout}
                      onChange={(e) => setBrandAbout(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none resize-none"
                      placeholder="Contale a tus clientes de qué se trata tu negocio, formas de entrega, o zona de cobertura."
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="brand-map-url" className="text-xs font-semibold text-slate-400 block">Ubicación del Local (Enlace de Google Maps):</label>
                    <input
                      id="brand-map-url"
                      type="text"
                      value={brandMapUrl}
                      onChange={(e) => setBrandMapUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                      placeholder="Ej: https://maps.google.com/?q=-34.6037,-58.3816 o dirección exacta para ver en el mapa"
                    />
                    <span className="text-[10px] text-slate-500 block leading-tight">Dejá este campo vacío si no deseás mostrar el botón de mapa en la página pública.</span>
                  </div>

                  {/* Preview Banner */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Vista Previa Rápida del Encabezado</h4>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {brandLogo ? (
                          <img src={brandLogo} alt="Logo Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="font-bold text-indigo-400 text-sm">🧪</span>
                        )}
                      </div>
                      <div>
                        <strong className="text-xs text-slate-200 block">{brandHeaderName || tenant.name}</strong>
                        <span className="text-[9px] text-slate-400 italic block">{brandSlogan || 'Sin eslogan definido'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="pt-2">
                    <button
                      id="save-branding-changes-btn"
                      onClick={handleSaveBranding}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-colors"
                    >
                      <Save className="w-4 h-4" /> Guardar Cambios de Apariencia
                    </button>
                  </div>

                  <div className="border-t border-slate-800 my-4"></div>

                  {/* QR Code and Sharing Container */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/10 shadow-lg space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-xs text-slate-200 block">Código QR y Compartir Tienda</strong>
                        <span className="text-[10px] text-slate-400">Tus clientes pueden escanear el QR para ver tus ofertas y hacer pedidos.</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                      {/* QR Image Wrapper */}
                      <div className="p-2.5 bg-white rounded-xl shadow-inner flex items-center justify-center shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`)}`}
                          alt="QR Code" 
                          className="w-28 h-28"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* QR Info and share actions */}
                      <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                        <strong className="text-xs text-slate-300 block">Compartí tu catálogo online</strong>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Este código QR es único para tu negocio. Descargalo e imprimilo para colocarlo en tu mostrador o vidriera.
                        </p>

                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                          {/* WhatsApp share */}
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`👋 ¡Hola! Te invito a visitar la tienda online de *${tenant.name}*. Podés ver nuestros productos, ofertas especiales y hacer tu pedido de forma rápida y sencilla desde aquí:\n\n🔗 ${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Compartir por WhatsApp</span>
                          </a>

                          {/* Copy URL trigger */}
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`;
                              navigator.clipboard.writeText(url);
                              showAdminToast('¡Enlace copiado al portapapeles!', 'success');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <span>Copiar Enlace</span>
                          </button>

                          {/* Download QR image trigger */}
                          <a
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?codigo=${tenant.id}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-lg text-[11px] font-bold transition-colors"
                          >
                            <span>Descargar QR</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* --- TAB 7: GENERAL SETTINGS --- */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Configuración General del Comercio</h3>
                  <p className="text-xs text-slate-400">Modifica directivas operativas de envíos y la apariencia del Panel de Control.</p>
                </div>

                {/* Delivery toggle option */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-emerald-400" />
                        Habilitar Entregas a Domicilio ("Envíos")
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Habilita o deshabilita la opción para que el cliente solicite envío a domicilio en la tienda pública.</p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="allow-delivery-toggle"
                        type="checkbox"
                        checked={tenant.allowDelivery}
                        onChange={(e) => {
                          onUpdateTenant({
                            ...tenant,
                            allowDelivery: e.target.checked
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* Admin Theme toggle option */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Tema Visual del Panel de Control (Admin):</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { key: 'slate-dark', name: 'Oscuro Espacial', bg: 'bg-slate-900 border-slate-800 text-slate-100' },
                      { key: 'light', name: 'Blanco Limpio', bg: 'bg-white border-slate-200 text-slate-800' },
                      { key: 'emerald', name: 'Esmeralda Profesional', bg: 'bg-emerald-950 border-emerald-900 text-emerald-50' }
                    ] as const).map(th => (
                      <button
                        key={th.key}
                        onClick={() => {
                          onUpdateTenant({
                            ...tenant,
                            adminTheme: th.key
                          });
                        }}
                        className={`p-3.5 rounded-xl border-2 text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                          tenant.adminTheme === th.key
                            ? 'border-indigo-500 shadow-lg'
                            : 'border-transparent bg-slate-950 hover:bg-slate-900/80 text-slate-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${
                          th.key === 'slate-dark' ? 'bg-slate-800' : th.key === 'emerald' ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}></div>
                        <div>
                          <span className="text-xs font-bold block leading-tight">{th.name}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Cambia el fondo de la consola</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* 3. CRUD PRODUCT MODAL FORM */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {editingProduct ? '📝 Editar Producto Químico' : '➕ Registrar Nuevo Producto'}
              </span>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Product Title */}
              <div className="space-y-1">
                <label htmlFor="modal-prod-name" className="text-xs font-semibold text-slate-400 block">Nombre del Producto *</label>
                <input
                  id="modal-prod-name"
                  type="text"
                  required
                  placeholder="Ej. Jabón Líquido Bio-Lavanda"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="modal-prod-category" className="text-xs font-semibold text-slate-400 block">Categoría *</label>
                  <div className="flex items-center gap-2">
                    <select
                      id="modal-prod-category"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      title="Agregar nueva categoría"
                      className="shrink-0 w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCategory}
                      title="Quitar la categoría seleccionada (si no tiene productos)"
                      className="shrink-0 w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-prod-unit" className="text-xs font-semibold text-slate-400 block">Unidad de Medida *</label>
                  <div className="flex items-center gap-2">
                    <select
                      id="modal-prod-unit"
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      {unitOptions.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      title="Agregar nueva unidad de medida"
                      className="shrink-0 w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveUnit}
                      title="Quitar la unidad seleccionada (si no tiene productos)"
                      className="shrink-0 w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="modal-prod-price" className="text-xs font-semibold text-slate-400 block">Precio Lista ($) *</label>
                  <input
                    id="modal-prod-price"
                    type="number"
                    required
                    min="1"
                    placeholder="Ej. 1800"
                    value={prodPrice === 0 ? '' : prodPrice}
                    onChange={(e) => setProdPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-prod-stock" className="text-xs font-semibold text-slate-400 block">Stock Disponible (Unidades) *</label>
                  <input
                    id="modal-prod-stock"
                    type="number"
                    required
                    min="0"
                    placeholder="Ej. 50"
                    value={prodStock === 0 ? '' : prodStock}
                    onChange={(e) => setProdStock(e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Slogan details / promo flags */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-[11px] text-slate-300 block">Colocar en Promoción / Oferta Especial</strong>
                    <span className="text-[9px] text-slate-500 block">Reduce el precio y lo resalta en el catálogo principal.</span>
                  </div>
                  <input
                    id="modal-prod-ispromo"
                    type="checkbox"
                    checked={prodIsPromo}
                    onChange={(e) => setProdIsPromo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 focus:ring-0 rounded"
                  />
                </div>

                {prodIsPromo && (
                  <div className="space-y-1 pt-2 border-t border-slate-800 animate-fade-in">
                    <label htmlFor="modal-prod-promoprice" className="text-xs font-semibold text-red-400 block">Precio de Oferta ($) *</label>
                    <input
                      id="modal-prod-promoprice"
                      type="number"
                      required={prodIsPromo}
                      min="1"
                      placeholder="Ej. 1400"
                      value={prodPromoPrice === 0 ? '' : prodPromoPrice}
                      onChange={(e) => setProdPromoPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Image Input and local File Uploader */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 block">Imagen del Producto</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <input
                      id="modal-prod-img"
                      type="text"
                      placeholder="Pegue URL (https://...) o cargue"
                      value={prodImg}
                      onChange={(e) => setProdImg(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">Soporta dirección web o archivo local.</span>
                  </div>
                  
                  {/* Local File Selector for mobile/pc */}
                  <div>
                    <label className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Subir desde PC/Móvil</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setProdImg(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {prodImg && (
                  <div className="flex items-center gap-2 p-1.5 bg-slate-950/50 rounded-lg border border-slate-800/40">
                    <img src={prodImg} alt="Vista previa" className="w-10 h-10 rounded object-cover border border-slate-850" referrerPolicy="no-referrer" />
                    <span className="text-[10px] text-slate-400 truncate flex-1 font-mono">Archivo de imagen cargado</span>
                    <button
                      type="button"
                      onClick={() => setProdImg('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300')}
                      className="text-[9px] text-red-400 hover:underline font-bold"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic custom fields manager ("opcion + para agregar otros campos") */}
              <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                  <div>
                    <strong className="text-[11px] text-slate-300 block">Campos Adicionales Especiales</strong>
                    <span className="text-[9px] text-slate-500 block">Especificaciones extras como PH, aroma, concentración, etc.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProdCustomFields([...prodCustomFields, { key: '', value: '' }]);
                    }}
                    className="flex items-center gap-0.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Campo
                  </button>
                </div>

                {prodCustomFields.length === 0 ? (
                  <div className="text-center py-2 text-[10px] text-slate-600 italic">
                    No hay campos personalizados agregados. Haz clic en '+ Agregar Campo'.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {prodCustomFields.map((cf, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Propiedad (ej. PH)"
                          value={cf.key}
                          onChange={(e) => {
                            const newFields = [...prodCustomFields];
                            newFields[idx].key = e.target.value;
                            setProdCustomFields(newFields);
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Valor (ej. Neutro 7.2)"
                          value={cf.value}
                          onChange={(e) => {
                            const newFields = [...prodCustomFields];
                            newFields[idx].value = e.target.value;
                            setProdCustomFields(newFields);
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = prodCustomFields.filter((_, i) => i !== idx);
                            setProdCustomFields(newFields);
                          }}
                          className="text-red-400 hover:text-red-300 text-xs font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="modal-prod-desc" className="text-xs font-semibold text-slate-400 block">Descripción del Producto</label>
                <textarea
                  id="modal-prod-desc"
                  rows={2}
                  placeholder="Explique las fragancias, propiedades bactericidas u otras cualidades..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              {/* Submit buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3 mt-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  ✓ Confirmar y Guardar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Admin Feedback Toast */}
      {adminToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up bg-slate-900 border border-indigo-500/30 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm">
          <div className={`w-2 h-2 rounded-full ${adminToast.type === 'success' ? 'bg-emerald-400' : adminToast.type === 'error' ? 'bg-red-400' : 'bg-indigo-400'}`} />
          <span className="text-xs font-semibold leading-relaxed">{adminToast.message}</span>
        </div>
      )}

      {/* Custom Admin Confirmation Dialog Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">{confirmModal.title}</h4>
              <p className="text-xs text-slate-400 leading-normal">{confirmModal.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                No, cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
