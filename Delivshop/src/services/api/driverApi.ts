import { apiClient } from './client';
import { Delivery, UpdateDeliveryStatusPayload } from '@/types/delivery';

export const driverApi = {
  async getAssignedDeliveries(): Promise<Delivery[]> {
    return apiClient<Delivery[]>('deliveries/assigned');
  },

  async updateDeliveryStatus(deliveryId: string, payload: UpdateDeliveryStatusPayload): Promise<Delivery> {
    return apiClient<Delivery>(`deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateLocation(latitude: number, longitude: number): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>('driver/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  },
};
