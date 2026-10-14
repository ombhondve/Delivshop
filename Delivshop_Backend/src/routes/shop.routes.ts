import { Router } from 'express';
import { shopController } from '../controllers/shop.controller.js';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// Public shop details
router.get('/:shopId', shopController.getShop);
router.get('/:shopId/products', shopController.getProducts);

// Protected shop owner / admin routes
router.get(
  '/:shopId/stats',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN'),
  shopController.getStats
);

router.get(
  '/:shopId/orders',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN'),
  orderController.getShopOrders
);

export default router;
