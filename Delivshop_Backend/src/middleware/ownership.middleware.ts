import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { query } from '../config/database.js';

/**
 * Enforce that a SHOP user only accesses orders belonging to their shop.
 * ADMINs bypass this restriction.
 */
export async function requireShopOrderOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  const orderId = req.params.orderId;
  if (!orderId) {
    return next();
  }

  try {
    const result = await query(
      `SELECT o.id, o.shop_id, s.owner_id 
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.id = $1`,
      [orderId]
    );

    if (result.rowCount === 0) {
      sendError(res, 'Order not found', 404);
      return;
    }

    const order = result.rows[0];
    const isOwner = order.owner_id === req.user.id || (req.user.shopId && order.shop_id === req.user.shopId);
    if (req.user.role === 'SHOP' && !isOwner) {
      sendError(res, 'Forbidden: You do not have permission to access orders from another shop', 403);
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Enforce that a DRIVER user only accesses deliveries assigned specifically to them.
 * ADMINs bypass this restriction.
 */
export async function requireDriverDeliveryAssignment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  const deliveryId = req.params.deliveryId;
  if (!deliveryId) {
    return next();
  }

  try {
    const result = await query(
      `SELECT id, driver_id FROM deliveries WHERE id = $1`,
      [deliveryId]
    );

    if (result.rowCount === 0) {
      sendError(res, 'Delivery not found', 404);
      return;
    }

    const delivery = result.rows[0];
    if (req.user.role === 'DRIVER' && delivery.driver_id !== req.user.id) {
      sendError(res, 'Forbidden: This delivery is not assigned to you', 403);
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
