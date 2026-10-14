import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PendingOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PendingOrder {
  localId: string;
  idempotencyKey: string;
  shopId: string;
  items: PendingOrderItem[];
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
    notes?: string;
  };
  subtotal: number;
  total: number;
  createdAt: string;
  status: 'PENDING_SYNC' | 'SYNCING' | 'CONFIRMED' | 'FAILED';
  errorMessage?: string;
  serverOrderNumber?: string;
  retryCount: number;
}

const QUEUE_PREFIX = '@delivshop_order_queue_';

function generateClientUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const OrderQueueManager = {
  getQueueKey(shopId: string): string {
    return `${QUEUE_PREFIX}${shopId}`;
  },

  async getPendingOrders(shopId: string): Promise<PendingOrder[]> {
    try {
      const raw = await AsyncStorage.getItem(this.getQueueKey(shopId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async saveQueue(shopId: string, queue: PendingOrder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getQueueKey(shopId), JSON.stringify(queue));
    } catch {
      // Storage error gracefully handled
    }
  },

  async createPendingOrder(
    shopId: string,
    items: PendingOrderItem[],
    deliveryAddress: { street: string; city: string; postalCode: string; notes?: string },
    subtotal: number,
    total: number
  ): Promise<PendingOrder> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const idempotencyKey = `idemp_${Date.now()}_${generateClientUuid()}`;

    const newOrder: PendingOrder = {
      localId,
      idempotencyKey,
      shopId,
      items,
      deliveryAddress,
      subtotal,
      total,
      createdAt: new Date().toISOString(),
      status: 'PENDING_SYNC',
      retryCount: 0,
    };

    const current = await this.getPendingOrders(shopId);
    current.unshift(newOrder);
    await this.saveQueue(shopId, current);

    return newOrder;
  },

  async updateOrderStatus(
    shopId: string,
    localId: string,
    status: PendingOrder['status'],
    details?: { serverOrderNumber?: string; errorMessage?: string }
  ): Promise<void> {
    const current = await this.getPendingOrders(shopId);
    const updated = current.map((order) => {
      if (order.localId === localId) {
        return {
          ...order,
          status,
          retryCount: status === 'FAILED' ? order.retryCount + 1 : order.retryCount,
          ...(details?.serverOrderNumber && { serverOrderNumber: details.serverOrderNumber }),
          ...(details?.errorMessage && { errorMessage: details.errorMessage }),
        };
      }
      return order;
    });

    // Remove successfully confirmed orders from active pending queue
    const remaining = updated.filter((o) => o.status !== 'CONFIRMED');
    await this.saveQueue(shopId, remaining);
  },

  async removeOrder(shopId: string, localId: string): Promise<void> {
    const current = await this.getPendingOrders(shopId);
    const remaining = current.filter((o) => o.localId !== localId);
    await this.saveQueue(shopId, remaining);
  },
};
