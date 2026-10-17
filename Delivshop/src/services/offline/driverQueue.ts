import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverApi } from '../api/driverApi';
import { CompleteDeliveryPayload, PaymentMethod } from '@/types/driver.types';

export type DriverOperationType =
  | 'COMPLETE_DELIVERY'
  | 'UPDATE_STOP_STATUS'
  | 'RECORD_COLLECTION'
  | 'REPORT_INCIDENT';

export interface PendingDriverOperation {
  localId: string;
  idempotencyKey: string;
  driverId: string;
  type: DriverOperationType;
  entityId: string; // e.g. deliveryId or runId
  payload: any;
  createdAt: string;
  status: 'PENDING_SYNC' | 'SYNCING' | 'CONFIRMED' | 'FAILED';
  errorMessage?: string;
  retryCount: number;
}

const DRIVER_QUEUE_PREFIX = '@delivshop_driver_queue_';

function generateClientUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const DriverQueueManager = {
  getQueueKey(driverId: string): string {
    return `${DRIVER_QUEUE_PREFIX}${driverId}`;
  },

  async getPendingOperations(driverId: string): Promise<PendingDriverOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(this.getQueueKey(driverId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async saveQueue(driverId: string, queue: PendingDriverOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getQueueKey(driverId), JSON.stringify(queue));
    } catch {
      // Storage error gracefully handled
    }
  },

  async enqueueOperation(
    driverId: string,
    type: DriverOperationType,
    entityId: string,
    payload: any
  ): Promise<PendingDriverOperation> {
    const localId = `drv_op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const idempotencyKey = `idemp_drv_${Date.now()}_${generateClientUuid()}`;

    const newOp: PendingDriverOperation = {
      localId,
      idempotencyKey,
      driverId,
      type,
      entityId,
      payload,
      createdAt: new Date().toISOString(),
      status: 'PENDING_SYNC',
      retryCount: 0,
    };

    const current = await this.getPendingOperations(driverId);
    current.unshift(newOp);
    await this.saveQueue(driverId, current);

    return newOp;
  },

  async updateOperationStatus(
    driverId: string,
    localId: string,
    status: PendingDriverOperation['status'],
    details?: { errorMessage?: string }
  ): Promise<void> {
    const current = await this.getPendingOperations(driverId);
    const updated = current.map((op) => {
      if (op.localId === localId) {
        return {
          ...op,
          status,
          retryCount: status === 'FAILED' ? op.retryCount + 1 : op.retryCount,
          ...(details?.errorMessage && { errorMessage: details.errorMessage }),
        };
      }
      return op;
    });

    // Remove confirmed ops
    const remaining = updated.filter((op) => op.status !== 'CONFIRMED');
    await this.saveQueue(driverId, remaining);
  },

  async syncPendingQueue(driverId: string): Promise<{ synced: number; failed: number }> {
    const queue = await this.getPendingOperations(driverId);
    let synced = 0;
    let failed = 0;

    for (const op of queue) {
      if (op.status === 'CONFIRMED') continue;
      await this.updateOperationStatus(driverId, op.localId, 'SYNCING');

      try {
        if (op.type === 'COMPLETE_DELIVERY') {
          await driverApi.completeDelivery(op.entityId, op.payload as CompleteDeliveryPayload);
        } else if (op.type === 'UPDATE_STOP_STATUS') {
          const { runId, sequence, stopPayload } = op.payload;
          await driverApi.updateStopStatus(runId, sequence, stopPayload);
        } else if (op.type === 'RECORD_COLLECTION') {
          await driverApi.recordCollection(op.payload);
        } else if (op.type === 'REPORT_INCIDENT') {
          await driverApi.reportIncident(op.payload);
        }

        await this.updateOperationStatus(driverId, op.localId, 'CONFIRMED');
        synced++;
      } catch (err: any) {
        await this.updateOperationStatus(driverId, op.localId, 'FAILED', {
          errorMessage: err.message || 'Sync failed',
        });
        failed++;
      }
    }

    return { synced, failed };
  },

  async clearQueue(driverId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getQueueKey(driverId));
    } catch {
      // Graceful clear
    }
  },
};
