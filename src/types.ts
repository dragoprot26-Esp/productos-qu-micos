export interface TenantCustomization {
  logoUrl?: string;
  theme: 'eco-green' | 'aqua-fresh' | 'lavender-dream' | 'amber-warm' | 'clean-neutral';
  fontFamily: 'font-sans' | 'font-display' | 'font-mono';
  welcomeSlogan: string;
  aboutText: string;
  primaryColor: string; // Tailwind tint
  secondaryColor: string; // Tailwind tint
  mapUrl?: string; // Optional Google Maps location link
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customization: TenantCustomization;
  allowDelivery: boolean; // Managed by admin
  adminTheme: 'light' | 'slate-dark' | 'emerald';
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string; // e.g., "Litro", "500ml", "Kg", "Unidad"
  description: string;
  imageUrl: string;
  isPromo: boolean;
  promoPrice?: number;
  customFields?: Array<{ key: string; value: string }>; // dynamic custom fields
}

export interface Collaborator {
  id: string;
  tenantId: string;
  name: string;
  username: string;
  password?: string;
  phone?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tenantId: string;
  code: string; // Code for pickup (e.g., Q-5241)
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  deliveryType: 'delivery' | 'pickup';
  status: 'pending' | 'preparing' | 'ready_or_shipped' | 'completed' | 'cancelled';
  createdAt: string; // ISO String
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  lastOrderDate: string;
  totalSpent: number;
  ordersCount: number;
}

export interface AppNotification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  orderId?: string;
  type: 'new_order' | 'status_change' | 'stock_alert';
}

export type AdminTab = 'dashboard' | 'products' | 'orders' | 'history' | 'customization' | 'collaborators' | 'settings';

