import { assignmentRepository, DeliveryRunRecord } from '../repositories/assignment.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export const assignmentService = {
  async listAssignments(params?: {
    search?: string;
    deliveryDate?: string;
    status?: string;
    driverId?: string;
    vehicleId?: string;
    routeId?: string;
    city?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<DeliveryRunRecord[]> {
    return assignmentRepository.listAll(params);
  },

  async getSummary(date?: string): Promise<any> {
    return assignmentRepository.getSummary(date);
  },

  async getAssignmentDetails(id: string): Promise<DeliveryRunRecord> {
    const run = await assignmentRepository.findById(id);
    if (!run) {
      throw new AppError('Delivery assignment run not found', 404);
    }
    return run;
  },

  async validateConstraints(params: {
    driverId: string;
    vehicleId: string;
    routeId: string;
    deliveryDate: string;
    excludeRunId?: string;
  }): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    return assignmentRepository.validateConstraints(params);
  },

  async createAssignment(data: any, creatorId?: string, ipAddress?: string): Promise<DeliveryRunRecord> {
    try {
      const run = await assignmentRepository.createRun(data, creatorId);

      await auditService.log({
        actorId: creatorId || undefined,
        action: 'DELIVERY_RUN_ASSIGNED',
        entityType: 'DELIVERY_RUN',
        entityId: run.id,
        details: {
          runCode: run.run_code,
          routeId: run.route_id,
          driverId: run.driver_id,
          vehicleId: run.vehicle_id,
          deliveryDate: run.delivery_date,
          stopsCount: run.planned_stops_count,
        },
        ipAddress,
      });

      return run;
    } catch (err: any) {
      throw new AppError(err.message || 'Failed to dispatch delivery run assignment', 400);
    }
  },

  async updateStatus(
    runId: string,
    status: 'DRAFT' | 'VALIDATED' | 'ASSIGNED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    notes?: string,
    actorId?: string,
    ipAddress?: string
  ): Promise<DeliveryRunRecord> {
    const existing = await assignmentRepository.findById(runId);
    if (!existing) {
      throw new AppError('Delivery assignment run not found', 404);
    }

    const validTransitions: Record<string, string[]> = {
      DRAFT: ['VALIDATED', 'ASSIGNED', 'CANCELLED'],
      VALIDATED: ['ASSIGNED', 'READY', 'CANCELLED'],
      ASSIGNED: ['READY', 'IN_PROGRESS', 'CANCELLED'],
      READY: ['IN_PROGRESS', 'ASSIGNED', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(
        `Invalid status transition: Cannot transition delivery run from "${existing.status}" to "${status}".`,
        400
      );
    }

    const updated = await assignmentRepository.updateStatus(runId, status, notes);
    if (!updated) {
      throw new AppError('Failed to update delivery run status', 500);
    }

    await auditService.log({
      actorId: actorId || undefined,
      action: 'DELIVERY_RUN_STATUS_CHANGED',
      entityType: 'DELIVERY_RUN',
      entityId: runId,
      details: {
        runCode: existing.run_code,
        oldStatus: existing.status,
        newStatus: status,
        notes,
      },
      ipAddress,
    });

    return updated;
  },

  async updateStopStatus(
    runId: string,
    stopSequence: number,
    data: {
      status: 'PENDING' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
      notes?: string;
      proofOfDeliveryUrl?: string;
      failureReason?: string;
    },
    actorId?: string,
    ipAddress?: string
  ): Promise<any> {
    const existing = await assignmentRepository.findById(runId);
    if (!existing) {
      throw new AppError('Delivery assignment run not found', 404);
    }

    const updatedStop = await assignmentRepository.updateStopStatus(
      runId,
      stopSequence,
      data.status,
      data.notes,
      data.proofOfDeliveryUrl,
      data.failureReason
    );

    if (!updatedStop) {
      throw new AppError(`Stop #${stopSequence} not found on delivery run`, 404);
    }

    await auditService.log({
      actorId: actorId || undefined,
      action: 'DELIVERY_STOP_STATUS_UPDATED',
      entityType: 'DELIVERY_RUN_STOP',
      entityId: `${runId}-stop-${stopSequence}`,
      details: {
        runCode: existing.run_code,
        stopSequence,
        status: data.status,
        notes: data.notes,
      },
      ipAddress,
    });

    return updatedStop;
  },
};
