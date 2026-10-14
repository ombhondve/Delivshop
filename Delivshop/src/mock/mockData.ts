/**
 * Temporary mock data for UI testing and offline development.
 * Kept strictly isolated from real API services.
 */
import { Shop, ShopStats } from '@/types/shop';
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { Delivery } from '@/types/delivery';
import { User } from '@/types/auth';

export const MOCK_USER_SHOP: User = {
  id: 'usr_shop_01',
  email: 'shop@delivshop.local',
  name: 'Corner Market Store',
  role: 'SHOP',
  phone: '+1-555-0100',
  shopId: 'shop_01',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const MOCK_USER_DRIVER: User = {
  id: 'usr_driver_01',
  email: 'driver@delivshop.local',
  name: 'Alex Rivera',
  role: 'DRIVER',
  phone: '+1-555-0101',
  driverId: 'drv_01',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const MOCK_SHOP: Shop = {
  id: 'shop_01',
  name: 'Downtown Fresh Grocery',
  ownerId: 'usr_shop_01',
  email: 'downtown@delivshop.local',
  phone: '+1-555-0199',
  address: '124 Market St, Metropolis',
  isOpen: true,
  rating: 4.8,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

export const MOCK_SHOP_STATS: ShopStats = {
  todayOrders: 28,
  todayRevenue: 1420.5,
  pendingDeliveries: 4,
  activeProducts: 42,
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod_01',
    shopId: 'shop_01',
    name: 'Organic Hass Avocados (Pack of 4)',
    sku: 'AVO-4PK',
    price: 5.99,
    stockQuantity: 45,
    category: 'Produce',
    isActive: true,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'prod_02',
    shopId: 'shop_01',
    name: 'Artisan Sourdough Loaf',
    sku: 'BRD-SRD',
    price: 6.49,
    stockQuantity: 18,
    category: 'Bakery',
    isActive: true,
    createdAt: '2026-01-11T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord_101',
    orderNumber: 'DS-2026-101',
    shopId: 'shop_01',
    shopName: 'Downtown Fresh Grocery',
    driverId: 'drv_01',
    driverName: 'Alex Rivera',
    status: 'IN_TRANSIT',
    subtotal: 12.48,
    deliveryFee: 3.5,
    total: 15.98,
    items: [
      {
        id: 'item_1',
        productId: 'prod_01',
        name: 'Organic Hass Avocados (Pack of 4)',
        quantity: 1,
        unitPrice: 5.99,
        totalPrice: 5.99,
      },
      {
        id: 'item_2',
        productId: 'prod_02',
        name: 'Artisan Sourdough Loaf',
        quantity: 1,
        unitPrice: 6.49,
        totalPrice: 6.49,
      },
    ],
    deliveryAddress: {
      street: '742 Evergreen Terrace',
      city: 'Metropolis',
      postalCode: '10001',
    },
    createdAt: '2026-03-10T14:20:00.000Z',
    updatedAt: '2026-03-10T14:45:00.000Z',
  },
];

export const MOCK_DELIVERIES: Delivery[] = [
  {
    id: 'del_301',
    orderId: 'ord_101',
    orderNumber: 'DS-2026-101',
    driverId: 'drv_01',
    shopId: 'shop_01',
    shopName: 'Downtown Fresh Grocery',
    pickupAddress: '124 Market St, Metropolis',
    dropoffAddress: '742 Evergreen Terrace, Metropolis',
    status: 'EN_ROUTE_DROPOFF',
    estimatedDeliveryMinutes: 12,
    customerName: 'Sarah Jenkins',
    customerPhone: '+1-555-0322',
    currentLocation: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    createdAt: '2026-03-10T14:30:00.000Z',
    updatedAt: '2026-03-10T14:45:00.000Z',
  },
];
