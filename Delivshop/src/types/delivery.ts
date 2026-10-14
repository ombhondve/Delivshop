export type DeliveryStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE_PICKUP'
  | 'ARRIVED_PICKUP'
  | 'PICKED_UP'
  | 'EN_ROUTE_DROPOFF'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface Delivery {
  id: string;
  orderId?: string;
  order_id?: string;
  orderNumber?: string;
  order_number?: string;
  driverId?: string;
  driver_id?: string;
  shopId?: string;
  shop_id?: string;
  shopName?: string;
  shop_name?: string;
  pickupAddress?: string;
  shop_address?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  is_location_verified?: boolean;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
  delivery_instructions?: string | null;
  dropoffAddress?: string;
  status: DeliveryStatus;
  estimatedDeliveryMinutes?: number;
  customerName?: string;
  customerPhone?: string;
  currentLocation?: LocationCoordinates;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateDeliveryStatusPayload {
  status: DeliveryStatus;
  currentLatitude?: number;
  currentLongitude?: number;
  notes?: string;
}
