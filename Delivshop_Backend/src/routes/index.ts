import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import shopRoutes from './shop.routes.js';
import shopPortalRoutes from './shop-portal.routes.js';
import orderRoutes from './order.routes.js';
import deliveryRoutes from './delivery.routes.js';
import companyRoutes from './company.routes.js';
import productRoutes from './product.routes.js';
import inventoryRoutes from './inventory.routes.js';
import vehicleRoutes from './vehicle.routes.js';
import routeRoutes from './route.routes.js';
import assignmentRoutes from './assignment.routes.js';
import collectionRoutes from './collection.routes.js';

const apiRouter = Router();

// Ensure dynamic transactional API routes return live, complete responses and are not conditionally truncated to empty 304s
apiRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/shops', shopRoutes);
apiRouter.use('/shop', shopPortalRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/deliveries', deliveryRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/routes', routeRoutes);
apiRouter.use('/assignments', assignmentRoutes);
apiRouter.use('/collections', collectionRoutes);

export default apiRouter;


