import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import shopRoutes from './shop.routes.js';
import shopPortalRoutes from './shop-portal.routes.js';
import orderRoutes from './order.routes.js';
import deliveryRoutes from './delivery.routes.js';
import companyRoutes from './company.routes.js';

const apiRouter = Router();

apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/shops', shopRoutes);
apiRouter.use('/shop', shopPortalRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/deliveries', deliveryRoutes);

export default apiRouter;
