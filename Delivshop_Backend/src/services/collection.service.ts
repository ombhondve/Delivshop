import { collectionRepository, DeliveryCollectionRecord } from '../repositories/collection.repository.js';
import { assignmentRepository } from '../repositories/assignment.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export const collectionService = {
  async recordCollection(
    data: {
      runId: string;
      shopId: string;
      driverId: string;
      amount: number;
      paymentMethod: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
      transactionReference?: string;
      notes?: string;
    },
    actorId?: string,
    ipAddress?: string
  ): Promise<DeliveryCollectionRecord> {
    if (!data.amount || data.amount <= 0) {
      throw new AppError('Collection amount must be a positive decimal number.', 400);
    }

    const run = await assignmentRepository.findById(data.runId);
    if (!run) {
      throw new AppError('Associated delivery run assignment not found.', 404);
    }

    // Verify driver assignment ownership if actor is driver
    if (data.driverId && run.driver_id !== data.driverId) {
      throw new AppError('Driver is not authorized to collect payments for this delivery run.', 403);
    }

    const collection = await collectionRepository.createCollection(data);

    await auditService.log({
      actorId: actorId || data.driverId,
      action: 'PAYMENT_COLLECTED',
      entityType: 'COLLECTION',
      entityId: collection.id,
      details: {
        receiptNumber: collection.receipt_number,
        amount: collection.amount,
        paymentMethod: collection.payment_method,
        runId: data.runId,
        shopId: data.shopId,
      },
      ipAddress,
    });

    return collection;
  },

  async listCollections(params?: {
    driverId?: string;
    shopId?: string;
    runId?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<DeliveryCollectionRecord[]> {
    return collectionRepository.list(params);
  },

  async getSummary(driverId?: string) {
    return collectionRepository.getSummary(driverId);
  },

  async reconcileCollection(
    id: string,
    status: 'RECONCILED' | 'DEPOSITED' = 'RECONCILED',
    actorId: string,
    ipAddress?: string
  ): Promise<DeliveryCollectionRecord> {
    const updated = await collectionRepository.reconcile(id, actorId, status);
    if (!updated) {
      throw new AppError('Collection record not found', 404);
    }

    await auditService.log({
      actorId,
      action: 'PAYMENT_RECONCILED',
      entityType: 'COLLECTION',
      entityId: id,
      details: {
        receiptNumber: updated.receipt_number,
        newStatus: status,
      },
      ipAddress,
    });

    return updated;
  },
};
