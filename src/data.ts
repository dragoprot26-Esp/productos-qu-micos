import { Tenant, Product, Order, Client, AppNotification, Collaborator } from './types';

// Let's seed 3 mock tenants
export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'eco-quimica',
    name: 'Eco-Química Argentina',
    subdomain: 'ecoquimica',
    customization: {
      theme: 'eco-green',
      fontFamily: 'font-sans',
      welcomeSlogan: 'Detergentes y Desinfectantes Ecológicos Biodegradables',
      aboutText: 'Somos líderes en la elaboración de desodorantes, jabones líquidos y limpiadores concentrados que cuidan el medio ambiente sin perder poder de limpieza.',
      primaryColor: '#10b981', // green-500
      secondaryColor: '#059669', // green-600
      logoUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=150&h=150&fit=crop&q=80', // Aesthetic leaf/home image
      mapUrl: 'https://maps.google.com/?q=Eco-Quimica+Argentina'
    },
    allowDelivery: true,
    adminTheme: 'slate-dark'
  },
  {
    id: 'aroma-brillo',
    name: 'Aroma & Brillo',
    subdomain: 'aromabrillo',
    customization: {
      theme: 'lavender-dream',
      fontFamily: 'font-display',
      welcomeSlogan: 'Aromatizantes Premium y Suavizantes de Alta Duración',
      aboutText: 'Especialistas en fragancias de ambiente, difusores, desodorantes de piso y jabones líquidos ultra perfumados para que cada rincón de tu casa brille y huela increíble.',
      primaryColor: '#8b5cf6', // violet-500
      secondaryColor: '#7c3aed', // violet-600
      logoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=150&h=150&fit=crop&q=80', // Fragrance bottle preset
      mapUrl: 'https://maps.google.com/?q=Aroma+and+Brillo'
    },
    allowDelivery: true,
    adminTheme: 'emerald'
  },
  {
    id: 'quimica-industrial',
    name: 'Química Industrial Norte',
    subdomain: 'quimicanorte',
    customization: {
      theme: 'amber-warm',
      fontFamily: 'font-mono',
      welcomeSlogan: 'Soluciones de Limpieza Industrial y Venta Mayorista',
      aboutText: 'Fabricación y distribución de desengrasantes potentes, jabón líquido premium en bidones de 5 litros, aromatizantes concentrados e insumos químicos de máxima pureza.',
      primaryColor: '#f59e0b', // amber-500
      secondaryColor: '#d97706', // amber-600
      logoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=150&h=150&fit=crop&q=80', // Tech lab preset
      mapUrl: 'https://maps.google.com/?q=Quimica+Industrial+Norte'
    },
    allowDelivery: false, // Starts disabled, admin can toggle
    adminTheme: 'light'
  }
];

// Seeded products for each tenant
export const INITIAL_PRODUCTS: Product[] = [
  // --- Eco-Química Argentina Products ---
  {
    id: 'eco-p1',
    tenantId: 'eco-quimica',
    name: 'Jabón Líquido Bio-Coco',
    category: 'Jabones Líquidos',
    price: 3200,
    stock: 45,
    unit: 'Litro',
    description: 'Jabón líquido ecológico a base de aceite de coco biodegradable. Suave con las manos, ideal para pieles sensibles.',
        imageUrl: 'https://images.unsplash.com/photo-1607006342411-9240dbb08c90?w=400&auto=format&fit=crop&q=60',
    isPromo: true,
    promoPrice: 2800,
    customFields: [
      { key: 'Concentración', value: 'Biológico Activo 85%' },
      { key: 'pH', value: 'Neutro (7.2)' },
      { key: 'Precauciones', value: 'Mantener alejado de niños' }
    ]
  },
  {
    id: 'eco-p2',
    tenantId: 'eco-quimica',
    name: 'Desodorante de Ambientes Citronela',
    category: 'Desodorantes y Aromatizantes',
    price: 1800,
    stock: 60,
    unit: '500ml',
    description: 'Aromatizante y repelente natural de insectos. Elaborado con aceites esenciales de citronela orgánica pura.',
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&auto=format&fit=crop&q=60',
    isPromo: false
  },
  {
    id: 'eco-p3',
    tenantId: 'eco-quimica',
    name: 'Limpiador Multiuso de Naranja',
    category: 'Limpiadores Generales',
    price: 2500,
    stock: 28,
    unit: 'Litro',
    description: 'Desengrasante ultra potente formulado con terpenos de naranja natural. Quita manchas difíciles sin químicos nocivos.',
    imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&auto=format&fit=crop&q=60',
    isPromo: true,
    promoPrice: 2100
  },
  {
    id: 'eco-p4',
    tenantId: 'eco-quimica',
    name: 'Suavizante Textil Lavender-Ecológico',
    category: 'Lavandería',
    price: 2900,
    stock: 15,
    unit: 'Litro',
    description: 'Acondicionador textil biodegradable con aroma calmante de flores de lavanda. Protege los tejidos y el medio ambiente.',
    imageUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&auto=format&fit=crop&q=60',
    isPromo: false
  },
  {
    id: 'eco-p5',
    tenantId: 'eco-quimica',
    name: 'Jabón de Vajilla Neutro-Gel',
    category: 'Jabones Líquidos',
    price: 1600,
    stock: 50,
    unit: '750ml',
    description: 'Lavavajillas concentrado sin fragancias ni colorantes artificiales. Altamente espumoso y rinde el doble.',
    imageUrl: 'https://images.unsplash.com/photo-1585559606135-0d7600f12c75?w=400&auto=format&fit=crop&q=60',
    isPromo: false
  },

  // --- Aroma & Brillo Products ---
  {
    id: 'aroma-p1',
    tenantId: 'aroma-brillo',
    name: 'Aromatizante Textil Vainilla Sweet',
    category: 'Desodorantes y Aromatizantes',
    price: 2200,
    stock: 80,
    unit: '500ml',
    description: 'Fragancia premium para telas, cortinas y sábanas. Exquisito aroma a vainilla francesa con notas de caramelo.',
    imageUrl: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=400&auto=format&fit=crop&q=60',
    isPromo: true,
    promoPrice: 1900
  },
  {
    id: 'aroma-p2',
    tenantId: 'aroma-brillo',
    name: 'Difusor de Varillas Bamboo Zen',
    category: 'Desodorantes y Aromatizantes',
    price: 3500,
    stock: 35,
    unit: 'Unidad',
    description: 'Difusor ambiental de varillas de madera que liberan de forma continua un aroma fresco de bamboo y té verde.',
    imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=400&auto=format&fit=crop&q=60',
    isPromo: false
  },
  {
    id: 'aroma-p3',
    tenantId: 'aroma-brillo',
    name: 'Desodorante de Piso Brisa Primaveral',
    category: 'Limpiadores Generales',
    price: 1700,
    stock: 120,
    unit: 'Litro',
    description: 'Limpiador aromatizante concentrado para pisos cerámicos y flotantes. Perfume de larga duración por hasta 24 horas.',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=60',
    isPromo: true,
    promoPrice: 1400
  },
  {
    id: 'aroma-p4',
    tenantId: 'aroma-brillo',
    name: 'Jabón Líquido Cremoso de Rosas',
    category: 'Jabones Líquidos',
    price: 2600,
    stock: 40,
    unit: 'Litro',
    description: 'Jabón líquido corporal e higiénico con perlas humectantes y perfume de rosas de Bulgaria.',
    imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=60',
    isPromo: false
  },

  // --- Química Industrial Norte Products ---
  {
    id: 'ind-p1',
    tenantId: 'quimica-industrial',
    name: 'Desengrasante Industrial Ultra-Forte',
    category: 'Limpiadores Generales',
    price: 8500,
    stock: 20,
    unit: '5 Litros',
    description: 'Fórmula alcalina concentrada de nivel profesional para remover grasas pesadas, aceites lubricantes y suciedad carbonizada.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60',
    isPromo: false
  },
  {
    id: 'ind-p2',
    tenantId: 'quimica-industrial',
    name: 'Jabón Líquido Industrial Azul Bidón',
    category: 'Jabones Líquidos',
    price: 7200,
    stock: 30,
    unit: '5 Litros',
    description: 'Jabón líquido alcalino de alto rendimiento para ropa de trabajo o lavado masivo de prendas blancas y de color.',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=60',
    isPromo: true,
    promoPrice: 6500
  },
  {
    id: 'ind-p3',
    tenantId: 'quimica-industrial',
    name: 'Aromatizante de Ambientes Glacial Concentrado',
    category: 'Desodorantes y Aromatizantes',
    price: 9800,
    stock: 15,
    unit: '5 Litros',
    description: 'Fragancia marina e invernal concentrada ideal para atomizadores mecánicos y grandes superficies o salones.',
    imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&auto=format&fit=crop&q=60',
    isPromo: true,
    promoPrice: 8900
  }
];

// Rich set of historical orders to build beautiful charts
export const INITIAL_ORDERS: Order[] = [
  // --- Eco-Química Argentina Orders ---
  {
    id: 'eco-o1',
    tenantId: 'eco-quimica',
    code: 'ECO-2849',
    customerName: 'Ariel Di Francesco',
    customerPhone: '+54 11 6589-2344',
    items: [
      { productId: 'eco-p1', name: 'Jabón Líquido Bio-Coco', quantity: 2, price: 2800 },
      { productId: 'eco-p3', name: 'Limpiador Multiuso de Naranja', quantity: 1, price: 2100 }
    ],
    total: 7700,
    deliveryType: 'pickup',
    status: 'completed',
    createdAt: '2026-06-10T14:30:00Z'
  },
  {
    id: 'eco-o2',
    tenantId: 'eco-quimica',
    code: 'ECO-9201',
    customerName: 'Laura Benítez',
    customerPhone: '+54 11 3042-8819',
    items: [
      { productId: 'eco-p4', name: 'Suavizante Textil Lavender-Ecológico', quantity: 3, price: 2900 }
    ],
    total: 8700,
    deliveryType: 'delivery',
    status: 'completed',
    createdAt: '2026-06-15T18:15:00Z'
  },
  {
    id: 'eco-o3',
    tenantId: 'eco-quimica',
    code: 'ECO-1145',
    customerName: 'Carlos Gómez',
    customerPhone: '+54 9 341 555-1122',
    items: [
      { productId: 'eco-p1', name: 'Jabón Líquido Bio-Coco', quantity: 1, price: 2800 },
      { productId: 'eco-p5', name: 'Jabón de Vajilla Neutro-Gel', quantity: 2, price: 1600 }
    ],
    total: 6000,
    deliveryType: 'pickup',
    status: 'pending',
    createdAt: '2026-06-25T11:00:00Z' // Today (based on 2026-06-25 timestamp)
  },
  {
    id: 'eco-o4',
    tenantId: 'eco-quimica',
    code: 'ECO-7762',
    customerName: 'Marta Rodriguez',
    customerPhone: '+54 11 9928-1100',
    items: [
      { productId: 'eco-p3', name: 'Limpiador Multiuso de Naranja', quantity: 4, price: 2100 },
      { productId: 'eco-p2', name: 'Desodorante de Ambientes Citronela', quantity: 2, price: 1800 }
    ],
    total: 12000,
    deliveryType: 'delivery',
    status: 'ready_or_shipped',
    createdAt: '2026-06-25T14:20:00Z' // Today
  },
  {
    id: 'eco-o5',
    tenantId: 'eco-quimica',
    code: 'ECO-5381',
    customerName: 'Diego Perez',
    customerPhone: '+54 11 4455-8899',
    items: [
      { productId: 'eco-p5', name: 'Jabón de Vajilla Neutro-Gel', quantity: 5, price: 1600 }
    ],
    total: 8000,
    deliveryType: 'delivery',
    status: 'preparing',
    createdAt: '2026-06-25T15:45:00Z' // Today
  },
  // Previous Month Sales data points for graphs
  {
    id: 'eco-hist-1',
    tenantId: 'eco-quimica',
    code: 'ECO-0001',
    customerName: 'Consumidor Final',
    customerPhone: '+54 11 0000-0000',
    items: [{ productId: 'eco-p1', name: 'Lote Jabones', quantity: 10, price: 2500 }],
    total: 25000,
    deliveryType: 'pickup',
    status: 'completed',
    createdAt: '2026-05-02T10:00:00Z'
  },
  {
    id: 'eco-hist-2',
    tenantId: 'eco-quimica',
    code: 'ECO-0002',
    customerName: 'Consumidor Final',
    customerPhone: '+54 11 0000-0000',
    items: [{ productId: 'eco-p3', name: 'Lote Limpiadores', quantity: 15, price: 2000 }],
    total: 30000,
    deliveryType: 'pickup',
    status: 'completed',
    createdAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 'eco-hist-3',
    tenantId: 'eco-quimica',
    code: 'ECO-0003',
    customerName: 'Consumidor Final',
    customerPhone: '+54 11 0000-0000',
    items: [{ productId: 'eco-p4', name: 'Lote Suavizantes', quantity: 12, price: 2700 }],
    total: 32400,
    deliveryType: 'pickup',
    status: 'completed',
    createdAt: '2026-05-28T10:00:00Z'
  },
  {
    id: 'eco-hist-4',
    tenantId: 'eco-quimica',
    code: 'ECO-0004',
    customerName: 'Consumidor Final',
    customerPhone: '+54 11 0000-0000',
    items: [{ productId: 'eco-p1', name: 'Lote Limpiadores', quantity: 8, price: 2800 }],
    total: 22400,
    deliveryType: 'pickup',
    status: 'completed',
    createdAt: '2026-06-02T10:00:00Z'
  },
  {
    id: 'eco-hist-5',
    tenantId: 'eco-quimica',
    code: 'ECO-0005',
    customerName: 'Consumidor Final',
    customerPhone: '+54 11 0000-0000',
    items: [{ productId: 'eco-p2', name: 'Lote Fragancias', quantity: 20, price: 1800 }],
    total: 36000,
    deliveryType: 'delivery',
    status: 'completed',
    createdAt: '2026-06-08T12:00:00Z'
  },
  {
    id: 'eco-hist-6',
    tenantId: 'eco-quimica',
    code: 'ECO-0006',
    customerName: 'Consumidor Final',
    customerPhone: '+54 11 0000-0000',
    items: [{ productId: 'eco-p3', name: 'Lote Limpieza', quantity: 12, price: 2100 }],
    total: 25200,
    deliveryType: 'pickup',
    status: 'completed',
    createdAt: '2026-06-18T15:00:00Z'
  },
  {
    id: 'eco-hist-7',
    tenantId: 'eco-quimica',
    code: 'ECO-0007',
    customerName: 'Consumidor Final',
    customerPhone: '+54 11 0000-0000',
    items: [{ productId: 'eco-p4', name: 'Suavizantes', quantity: 15, price: 2900 }],
    total: 43500,
    deliveryType: 'delivery',
    status: 'completed',
    createdAt: '2026-06-22T09:30:00Z'
  },

  // --- Aroma & Brillo Orders ---
  {
    id: 'aro-o1',
    tenantId: 'aroma-brillo',
    code: 'ARO-1554',
    customerName: 'Sofia Loren',
    customerPhone: '+54 11 7622-0941',
    items: [
      { productId: 'aroma-p1', name: 'Aromatizante Textil Vainilla Sweet', quantity: 2, price: 1900 },
      { productId: 'aroma-p2', name: 'Difusor de Varillas Bamboo Zen', quantity: 1, price: 3500 }
    ],
    total: 7300,
    deliveryType: 'delivery',
    status: 'completed',
    createdAt: '2026-06-20T17:40:00Z'
  },
  {
    id: 'aro-o2',
    tenantId: 'aroma-brillo',
    code: 'ARO-8112',
    customerName: 'Esteban Quito',
    customerPhone: '+54 11 6211-5321',
    items: [
      { productId: 'aroma-p3', name: 'Desodorante de Piso Brisa Primaveral', quantity: 5, price: 1400 }
    ],
    total: 7000,
    deliveryType: 'pickup',
    status: 'pending',
    createdAt: '2026-06-25T16:00:00Z'
  }
];

// Initial mock clients generated from historical orders
export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'eco-c1',
    tenantId: 'eco-quimica',
    name: 'Ariel Di Francesco',
    phone: '+54 11 6589-2344',
    lastOrderDate: '2026-06-10',
    totalSpent: 7700,
    ordersCount: 1
  },
  {
    id: 'eco-c2',
    tenantId: 'eco-quimica',
    name: 'Laura Benítez',
    phone: '+54 11 3042-8819',
    lastOrderDate: '2026-06-15',
    totalSpent: 8700,
    ordersCount: 1
  },
  {
    id: 'eco-c3',
    tenantId: 'eco-quimica',
    name: 'Carlos Gómez',
    phone: '+54 9 341 555-1122',
    lastOrderDate: '2026-06-25',
    totalSpent: 6000,
    ordersCount: 1
  },
  {
    id: 'aro-c1',
    tenantId: 'aroma-brillo',
    name: 'Sofia Loren',
    phone: '+54 11 7622-0941',
    lastOrderDate: '2026-06-20',
    totalSpent: 7300,
    ordersCount: 1
  }
];

// Initial preseeded app notifications
export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'eco-n1',
    tenantId: 'eco-quimica',
    title: 'Nuevo Pedido Recibido',
    message: 'Carlos Gómez ha realizado el pedido ECO-1145 por un total de $6,000.',
    isRead: false,
    createdAt: '2026-06-25T11:02:00Z',
    orderId: 'eco-o3',
    type: 'new_order'
  },
  {
    id: 'eco-n2',
    tenantId: 'eco-quimica',
    title: 'Alerta de Stock Bajo',
    message: 'El producto "Suavizante Textil Lavender-Ecológico" se encuentra con stock de 15 unidades.',
    isRead: false,
    createdAt: '2026-06-25T12:00:00Z',
    type: 'stock_alert'
  }
];

// Presets for themes and styles in public section
export const THEME_PRESETS = {
  'eco-green': {
    primaryBg: 'bg-emerald-50',
    headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-700',
    accentText: 'text-emerald-700',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    gradientText: 'from-emerald-600 to-teal-600',
    cardBorder: 'hover:border-emerald-200'
  },
  'aqua-fresh': {
    primaryBg: 'bg-sky-50',
    headerBg: 'bg-gradient-to-r from-sky-600 to-cyan-700',
    accentText: 'text-sky-700',
    primaryButton: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500',
    badgeBg: 'bg-sky-100 text-sky-800',
    gradientText: 'from-sky-600 to-cyan-600',
    cardBorder: 'hover:border-sky-200'
  },
  'lavender-dream': {
    primaryBg: 'bg-violet-50',
    headerBg: 'bg-gradient-to-r from-violet-600 to-purple-700',
    accentText: 'text-violet-700',
    primaryButton: 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-500',
    badgeBg: 'bg-violet-100 text-violet-800',
    gradientText: 'from-violet-600 to-purple-600',
    cardBorder: 'hover:border-violet-200'
  },
  'amber-warm': {
    primaryBg: 'bg-amber-50',
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-600',
    accentText: 'text-amber-700',
    primaryButton: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
    badgeBg: 'bg-amber-100 text-amber-800',
    gradientText: 'from-amber-600 to-orange-600',
    cardBorder: 'hover:border-amber-200'
  },
  'clean-neutral': {
    primaryBg: 'bg-slate-50',
    headerBg: 'bg-gradient-to-r from-slate-700 to-slate-800',
    accentText: 'text-slate-800',
    primaryButton: 'bg-slate-800 hover:bg-slate-900 focus:ring-slate-700',
    badgeBg: 'bg-slate-100 text-slate-800',
    gradientText: 'from-slate-700 to-slate-900',
    cardBorder: 'hover:border-slate-200'
  }
};

export const FONT_PRESETS = {
  'font-sans': 'font-sans tracking-normal',
  'font-display': 'font-sans tracking-tight antialiased',
  'font-mono': 'font-mono tracking-tighter'
};

export const INITIAL_COLLABORATORS: Collaborator[] = [
  {
    id: 'colab-1',
    tenantId: 'eco-quimica',
    name: 'Gastón Alarcón (Socio)',
    username: 'gaston',
    password: '123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'colab-2',
    tenantId: 'aroma-brillo',
    name: 'Clara De Benedictis',
    username: 'clara',
    password: '123',
    createdAt: new Date().toISOString()
  }
];

