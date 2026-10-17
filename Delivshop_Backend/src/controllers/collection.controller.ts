import { Request, Response, NextFunction } from 'express';
import { collectionService } from '../services/collection.service.js';
import { sendSuccess } from '../utils/response.js';

export const collectionController = {
  async recordCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user?.role === 'DRIVER' ? req.user.id : req.body.driverId;
      const collection = await collectionService.recordCollection(
        {
          runId: req.body.runId,
          shopId: req.body.shopId,
          driverId,
          amount: parseFloat(req.body.amount),
          paymentMethod: req.body.paymentMethod,
          transactionReference: req.body.transactionReference,
          notes: req.body.notes,
        },
        req.user?.id,
        req.ip
      );
      sendSuccess(res, collection, 'Payment collection recorded and receipt issued', 201);
    } catch (err) {
      next(err);
    }
  },

  async listCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user?.role === 'DRIVER' 
        ? req.user.id 
        : (req.query.driverId as string | undefined);

      const collections = await collectionService.listCollections({
        driverId,
        shopId: req.query.shopId as string | undefined,
        runId: req.query.runId as string | undefined,
        status: req.query.status as string | undefined,
        paymentMethod: req.query.paymentMethod as string | undefined,
        search: req.query.search as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      });
      sendSuccess(res, collections);
    } catch (err) {
      next(err);
    }
  },

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user?.role === 'DRIVER' 
        ? req.user.id 
        : (req.query.driverId as string | undefined);

      const summary = await collectionService.getSummary(driverId);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },

  async reconcile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.body.status || 'RECONCILED';
      const updated = await collectionService.reconcileCollection(
        req.params.id,
        status,
        req.user!.id,
        req.ip
      );
      sendSuccess(res, updated, `Collection marked as ${status}`);
    } catch (err) {
      next(err);
    }
  },
};
