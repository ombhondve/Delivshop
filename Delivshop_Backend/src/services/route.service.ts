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

    if (data.stops && Array.isArray(data.stops) && data.stops.length > 0) {
      const shopSet = new Set<string>();
      for (const s of data.stops) {
        if (!s.shopId) {
          throw new AppError('Shop ID is required for each route stop.', 400);
        }
        if (shopSet.has(s.shopId)) {
          throw new AppError('Duplicate shop detected in route stop sequence. Each shop stop must be distinct.', 400);
        }
        shopSet.add(s.shopId);
      }

      const shopIds = Array.from(shopSet);
      const validation = await routeRepository.validateShopsEligibility(shopIds);
      if (validation.missingIds.length > 0) {
        throw new AppError(`One or more selected shops do not exist: ${validation.missingIds.join(', ')}`, 400);
      }
      if (validation.inactiveIds.length > 0) {
        throw new AppError(
          `Cannot assign inactive or deleted shops to route corridor: ${validation.inactiveIds.join(', ')}`,
          400
        );
      }
    }

    if (data.status === 'PUBLISHED') {
      if (!data.stops || !Array.isArray(data.stops) || data.stops.length === 0) {
        throw new AppError(
          'Cannot publish route upon creation: At least one stop is required before publishing.',
          400
        );
      }
    }

    const newRoute = await routeRepository.createWithStops(data, actorId);

    await auditService.log({
      actorId: actorId || undefined,
      action: data.status === 'PUBLISHED' ? 'ROUTE_PUBLISHED' : 'ROUTE_CREATED',
      entityType: 'ROUTE',
      entityId: newRoute.id,
      details: {
        routeCode: newRoute.route_code,
        name: newRoute.name,
        city: newRoute.city,
        depot: newRoute.depot,
        status: newRoute.status,
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

    // Prohibit mutating or regenerating the unique route code
    delete data.routeCode;
    delete data.route_code;

    // Handle publishing logic and business rules
    if (data.status === 'PUBLISHED') {
      // Idempotency: If already published and no other fields changed, return existing
      const otherKeys = Object.keys(data).filter((k) => k !== 'status');
      if (existing.status === 'PUBLISHED' && otherKeys.length === 0) {
        return existing;
      }

      // Pre-publication check: Route must have at least one stop
      const stopsCount = existing.stops?.length ?? existing.stops_count ?? 0;
      if (stopsCount === 0) {
        throw new AppError(
          'Cannot publish route: Route must have at least one assigned shop stop before publishing for delivery dispatch.',
          400
        );
      }

      // Pre-publication check: Validate that assigned shops are active
      if (existing.stops && existing.stops.length > 0) {
        const shopIds = existing.stops.map((s: any) => s.shop_id || s.shopId).filter(Boolean);
        if (shopIds.length > 0) {
          const validation = await routeRepository.validateShopsEligibility(shopIds);
          if (validation.missingIds.length > 0) {
            throw new AppError(
              `Cannot publish route: One or more assigned stops reference non-existent shops: ${validation.missingIds.join(', ')}`,
              400
            );
          }
          if (validation.inactiveIds.length > 0) {
            throw new AppError(
              `Cannot publish route: One or more assigned stops belong to inactive or closed shops: ${validation.inactiveIds.join(', ')}. Please update route stops before publishing.`,
              400
            );
          }
        }
      }
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

    const isPublishing = data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
    const action = isPublishing ? 'ROUTE_PUBLISHED' : 'ROUTE_UPDATED';

    await auditService.log({
      actorId: actorId || undefined,
      action,
      entityType: 'ROUTE',
      entityId: id,
      details: {
        changes: data,
        previousStatus: existing.status,
        newStatus: updated.status,
        stopsCount: updated.stops_count ?? existing.stops_count ?? 0,
      },
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

    const deps = await routeRepository.checkDependencies(routeId);
    if (deps.activeRunsCount > 0) {
      throw new AppError(
        `Cannot delete route: Associated with ${deps.activeRunsCount} active delivery run(s). Please complete, reassign, or cancel active runs before deleting.`,
        400
      );
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
