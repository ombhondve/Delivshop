import { Request, Response, NextFunction } from 'express';
import { pickupService } from '../services/pickup.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export const pickupController = {
  /**
   * GET /api/assignments/:id/pickup-requirements
   * Returns calculated product pickup requirements grouped by supplier company.
   * If driver role, prices are automatically omitted.
   */
  async getRunPickupRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const result = await pickupService.getPickupRequirements({
        runId: id,
        userRole,
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/routes/:id/pickup-requirements
   * Returns pickup requirements preview for a route template.
   */
  async getRoutePickupRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const date = req.query.date as string | undefined;
      const userRole = req.user?.role;
      const result = await pickupService.getPickupRequirements({
        routeId: id,
        date,
        userRole,
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/deliveries/runs/:id/pickups
   * Returns assigned supplier pickup stops for a delivery run.
   */
  async getDriverPickupStops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const result = await pickupService.getPickupRequirements({
        runId: id,
        userRole,
      });

      // Filter to relevant supplier company stop summaries for driver operational navigation
      const stops = result.companies.map((c) => ({
        companyId: c.companyId,
        companyCode: c.companyCode,
        companyName: c.companyName,
        companyType: c.companyType,
        contactPerson: c.contactPerson,
        phone: c.phone,
        addressLine1: c.addressLine1,
        city: c.city,
        postalCode: c.postalCode,
        latitude: c.latitude,
        longitude: c.longitude,
        hasCoordinates: c.hasCoordinates,
        stopSequence: c.stopSequence,
        status: c.status,
        arrivalTime: c.arrivalTime,
        completedTime: c.completedTime,
        verifiedDistanceMeters: c.verifiedDistanceMeters,
        totalRequiredUnits: c.totalRequiredUnits,
        totalCollectedUnits: c.totalCollectedUnits,
        // Only return products if already arrived / verified
        products: c.status !== 'PENDING' ? c.products : [],
        isUnlocked: c.status !== 'PENDING',
      }));

      sendSuccess(res, {
        runId: result.runId,
        runCode: result.runCode,
        deliveryDate: result.deliveryDate,
        summary: result.summary,
        stops,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/deliveries/runs/:id/pickups/:companyId/verify-proximity
   * Driver verifies GPS arrival within 300 metres of supplier company coordinates.
   */
  async verifyProximity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, companyId } = req.params;
      const { latitude, longitude, accuracy } = req.body;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new AppError('Valid latitude and longitude numbers are required', 400);
      }

      const result = await pickupService.verifyProximity(
        id,
        companyId,
        { latitude, longitude, accuracy },
        req.user!.id
      );

      if (!result.verified) {
        res.status(400).json({
          success: false,
          verified: false,
          distanceMeters: result.distanceMeters,
          message: result.message,
        });
        return;
      }

      sendSuccess(res, result, 'Proximity verified: Supplier pickup quantities unlocked');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/deliveries/runs/:id/pickups/:companyId/confirm
   * Driver confirms collected quantities and discrepancy reasons.
   */
  async confirmPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, companyId } = req.params;
      const { items, discrepancyReason, notes } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('At least one product item collection must be confirmed', 400);
      }

      const result = await pickupService.confirmPickup(
        id,
        companyId,
        { items, discrepancyReason, notes },
        req.user!.id
      );

      sendSuccess(res, result, 'Supplier pickup collection confirmed successfully');
    } catch (err) {
      next(err);
    }
  },
};
