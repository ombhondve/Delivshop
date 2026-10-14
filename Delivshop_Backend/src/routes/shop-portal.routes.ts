import { Router, Request, Response, NextFunction } from 'express';
import { shopAuthController } from '../controllers/shop-auth.controller.js';
import { shopController } from '../controllers/shop.controller.js';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// Enforce SHOP role and authentication for shop owner portal
router.use(authenticate);
router.use(authorizeRoles('SHOP', 'ADMIN'));

// GET /api/shop/me
router.get('/me', shopAuthController.getMyProfile);

// GET /api/shop/orders
router.get('/orders', (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.shopId) {
    (req.params as any).shopId = req.user.shopId;
  }
  return orderController.getShopOrders(req, res, next);
});

// GET /api/shop/invoices
router.get('/invoices', (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.shopId) {
    (req.params as any).shopId = req.user.shopId;
  }
  return shopController.getInvoices(req, res, next);
});

// GET /api/shop/payments
router.get('/payments', (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.shopId) {
    (req.params as any).shopId = req.user.shopId;
  }
  return shopController.getPayments(req, res, next);
});

// GET /api/shop/deliveries
router.get('/deliveries', (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.shopId) {
    (req.params as any).shopId = req.user.shopId;
  }
  return shopController.getDeliveries(req, res, next);
});

// GET /api/shop/products
router.get('/products', (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.shopId) {
    (req.params as any).shopId = req.user.shopId;
  }
  return shopController.getProducts(req, res, next);
});

export default router;
