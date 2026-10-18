export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type SchedulingStatus =
  | 'AWAITING_SCHEDULING'
  | 'SCHEDULED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  order_number?: string;
  shopId: string;
  shop_id?: string;
  shopName: string;
  shop_name?: string;
  driverId?: string;
  driverName?: string;
  driver_name?: string;
  status: OrderStatus;
  schedulingStatus?: SchedulingStatus;
  scheduling_status?: SchedulingStatus;
  requestedDeliveryDate?: string | null;
  requested_delivery_date?: string | null;
  confirmedDeliveryDate?: string | null;
  confirmed_delivery_date?: string | null;
  deliveryWindow?: string | null;
  delivery_window?: string | null;
  deliveryRunId?: string | null;
  delivery_run_id?: string | null;
  runCode?: string | null;
  run_code?: string | null;
  notice?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
    notes?: string;
  };
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

