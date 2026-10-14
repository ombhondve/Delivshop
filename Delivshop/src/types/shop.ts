export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  email: string;
  phone: string;
  address: string;
  isOpen: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopStats {
  todayOrders: number;
  todayRevenue: number;
  pendingDeliveries: number;
  activeProducts: number;
}
