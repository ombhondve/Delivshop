import { Request, Response, NextFunction } from 'express';
import { routeService } from '../services/route.service.js';

export const routeController = {
  async listRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, city, depot, sortBy, sortOrder } = req.query;
      const routes = await routeService.listRoutes({
        search: search as string,
        status: status as string,
        city: city as string,
        depot: depot as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      });
      res.json({ success: true, data: routes });
    } catch (err) {
      next(err);
    }
  },

  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await routeService.getSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },

  async getRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const route = await routeService.getRouteDetails(id);
      res.json({ success: true, data: route });
    } catch (err) {
      next(err);
    }
  },

  async createRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const route = await routeService.createRoute(req.body, req.user?.id, req.ip);
      res.status(201).json({
        success: true,
        message: 'Delivery route created successfully',
        data: route,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await routeService.updateRoute(id, req.body, req.user?.id, req.ip);
      const isPublished = req.body.status === 'PUBLISHED';
      res.json({
        success: true,
        message: isPublished
          ? `Route "${updated.name}" (${updated.route_code}) published successfully and ready for dispatch`
          : 'Route metadata updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async publishRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await routeService.updateRoute(id, { status: 'PUBLISHED' }, req.user?.id, req.ip);
      res.json({
        success: true,
        message: `Route "${updated.name}" (${updated.route_code}) published successfully and ready for dispatch`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStops(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { stops, changesSummary } = req.body;
      const updated = await routeService.updateStops(
        id,
        stops,
        changesSummary,
        req.user?.id,
        req.ip
      );
      res.json({
        success: true,
        message: `Route stops resequenced. New version v${updated.version} published.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      await routeService.deleteRoute(id, req.user?.id, reason, req.ip);
      res.json({
        success: true,
        message: 'Delivery route archived successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
