import { Router } from 'express';
import { shopController } from '../controllers/shop.controller.js';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createShopSchema,
  updateShopSchema,
  updateShopStatusSchema,
  resolveMapLinkSchema,
} from '../schemas/shop.schema.js';

const router = Router();

// 1. SSRF-safe Google Maps URL resolver (Supplier / Admin only)
router.post(
  '/resolve-map-link',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  validateRequest(resolveMapLinkSchema),
  shopController.resolveMapLink
);

// 2. Shop Management Collection Routes (Supplier / Admin)
router.post(
  '/',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  validateRequest(createShopSchema),
  shopController.createShop
);

router.get(
  '/',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  shopController.listShops
);

// 3. Shop Details by ID or Shop ID
router.get(
  '/:shopId',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'SHOP', 'DRIVER'),
  shopController.getShop
);

router.patch(
  '/:shopId',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  validateRequest(updateShopSchema),
  shopController.updateShop
);

router.patch(
  '/:shopId/status',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  validateRequest(updateShopStatusSchema),
  shopController.updateStatus
);

router.post(
  '/:shopId/reissue-credentials',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  shopController.reissueCredentials
);

router.post(
  '/:shopId/invite',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  shopController.reissueCredentials
);

// 4. Shop Business Data Routes (Invoices, Payments, Deliveries, Products, Orders, Stats)
router.get(
  '/:shopId/invoices',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'SHOP'),
  shopController.getInvoices
);

router.get(
  '/:shopId/payments',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'SHOP'),
  shopController.getPayments
);

router.get(
  '/:shopId/deliveries',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'SHOP'),
  shopController.getDeliveries
);

router.get(
  '/:shopId/products',
  shopController.getProducts
);

router.get(
  '/:shopId/stats',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'SHOP'),
  shopController.getStats
);

router.get(
  '/:shopId/orders',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'SHOP'),
  orderController.getShopOrders
);

export default router;
