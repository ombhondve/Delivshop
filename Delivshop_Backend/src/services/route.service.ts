import { routeRepository, RouteRecord } from '../repositories/route.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export const routeService = {
  async listRoutes(params?: {
    search?: string;
    status?: string;
    city?: string;
    depot?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<RouteRecord[]> {
    return routeRepository.listAll(params);
  },

  async getSummary(): Promise<any> {
    return routeRepository.getSummary();
  },

  async getRouteDetails(id: string): Promise<any> {
    const route = await routeRepository.findById(id);
    if (!route) {
      throw new AppError('Route not found', 404);
    }

    const [versions, assignments] = await Promise.all([
      routeRepository.getVersions(id),
      routeRepository.getAssignmentHistory(id),
    ]);

    return {
      ...route,
      versions,
      assignments,
    };
  },

  async createRoute(data: any, actorId?: string, ipAddress?: string): Promise<RouteRecord> {
    if (data.routeCode) {
      const existing = await routeRepository.findByCode(data.routeCode);
      if (existing) {
        throw new AppError(`Route code "${data.routeCode}" is already in use.`, 409);
      }
    }

    const newRoute = await routeRepository.createWithStops(data, actorId);

    await auditService.log({
      actorId: actorId || undefined,
      action: 'ROUTE_CREATED',
      entityType: 'ROUTE',
      entityId: newRoute.id,
      details: {
        routeCode: newRoute.route_code,
        name: newRoute.name,
        city: newRoute.city,
        depot: newRoute.depot,
        stopCount: data.stops ? data.stops.length : 0,
      },
      ipAddress,
    });

    return (await routeRepository.findById(newRoute.id)) as RouteRecord;
  },

  async updateRoute(id: string, data: any, actorId?: string, ipAddress?: string): Promise<RouteRecord> {
    const existing = await routeRepository.findById(id);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    // If changing to INACTIVE, ensure no active runs exist
    if (data.status === 'INACTIVE' && existing.status !== 'INACTIVE') {
      const deps = await routeRepository.checkDependencies(id);
      if (deps.activeRunsCount > 0) {
        throw new AppError(
          `Cannot deactivate route: Currently associated with ${deps.activeRunsCount} active delivery run(s).`,
          400
        );
      }
    }

    const updated = await routeRepository.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update route', 500);
    }

    await auditService.log({
      actorId: actorId || undefined,
      action: 'ROUTE_UPDATED',
      entityType: 'ROUTE',
      entityId: id,
      details: { changes: data },
      ipAddress,
    });

    return updated;
  },

  async updateStops(
    routeId: string,
    stops: Array<{
      shopId: string;
      stopSequence: number;
      plannedArrivalTime?: string;
      serviceTimeMinutes?: number;
      deliveryInstructions?: string;
    }>,
    changesSummary?: string,
    actorId?: string,
    ipAddress?: string
  ): Promise<RouteRecord> {
    const existing = await routeRepository.findById(routeId);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    const shopSet = new Set<string>();
    for (const s of stops) {
      if (shopSet.has(s.shopId)) {
        throw new AppError('Duplicate shop detected in route stop sequence. Each shop stop must be distinct.', 400);
      }
      shopSet.add(s.shopId);
    }

    const updated = await routeRepository.updateStopsAndVersion(
      routeId,
      stops,
      changesSummary,
      actorId
    );

    if (!updated) {
      throw new AppError('Failed to update route stops', 500);
    }

    await auditService.log({
      actorId: actorId || undefined,
      action: 'ROUTE_STOPS_RESEQUENCED',
      entityType: 'ROUTE',
      entityId: routeId,
      details: {
        newVersion: updated.version,
        stopsCount: stops.length,
        changesSummary,
      },
      ipAddress,
    });

    return updated;
  },

  async deleteRoute(routeId: string, actorId?: string, reason?: string, ipAddress?: string): Promise<void> {
    const existing = await routeRepository.findById(routeId);
    if (!existing) {
      throw new AppError('Route not found', 404);
    }

    if (existing.status !== 'INACTIVE') {
      throw new AppError('Route must be deactivated before it can be deleted. Please set status to Inactive first.', 400);
    }

    const deps = await routeRepository.checkDependencies(routeId);
    if (deps.activeRunsCount > 0) {
      throw new AppError(`Cannot delete route: Associated with ${deps.activeRunsCount} active delivery run(s).`, 400);
    }

    await routeRepository.softDelete(routeId, actorId, reason);

    await auditService.log({
      actorId: actorId || undefined,
      action: 'ROUTE_DELETED',
      entityType: 'ROUTE',
      entityId: routeId,
      details: {
        routeCode: existing.route_code,
        historicalRunsCount: deps.historicalRunsCount,
        reason,
      },
      ipAddress,
    });
  },
};
