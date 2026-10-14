import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { shopAuthController } from '../controllers/shop-auth.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { shopLoginSchema, completeSetupSchema } from '../schemas/shop.schema.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// General User Auth
router.post('/register', authRateLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.getProfile);
router.post('/logout', authenticate, authController.logout);

// Shop Specific Auth
router.post(
  '/shop/login',
  authRateLimiter,
  validateRequest(shopLoginSchema),
  shopAuthController.login
);

router.post(
  '/shop/complete-setup',
  authenticate,
  validateRequest(completeSetupSchema),
  shopAuthController.completeSetup
);

router.post(
  '/shop/logout',
  authenticate,
  shopAuthController.logout
);

export default router;
