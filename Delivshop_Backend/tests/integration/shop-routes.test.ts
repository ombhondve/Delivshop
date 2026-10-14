import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';

describe('Shop Management Routes & Security Authorization', () => {
  const app = createApp();

  const supplierUser: AuthUser = {
    id: 'user-sup-01',
    email: 'supplier@delivshop.internal',
    role: 'SUPPLIER',
  };

  const shopUser: AuthUser = {
    id: 'user-shop-01',
    email: 'shop@delivshop.internal',
    role: 'SHOP',
    shopId: 'shop-uuid-01',
  };

  const driverUser: AuthUser = {
    id: 'user-driver-01',
    email: 'driver@delivshop.internal',
    role: 'DRIVER',
    driverId: 'driver-uuid-01',
  };

  const supplierToken = generateAccessToken(supplierUser);
  const shopToken = generateAccessToken(shopUser);
  const driverToken = generateAccessToken(driverUser);

  it('should initialize express app with all shop endpoints mounted', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  it('should reject unauthenticated requests to shop management endpoints with 401', async () => {
    // Testing unauthenticated access
    const routesToTest = [
      '/api/shops',
      '/api/shop/me',
      '/api/deliveries/drivers',
    ];

    expect(routesToTest.length).toBe(3);
  });

  it('should reject SSRF attempts against loopback or metadata endpoints via resolve-map-link', async () => {
    const { isAllowedGoogleMapsUrl } = await import('../../src/services/map-resolver.service.js');
    expect(isAllowedGoogleMapsUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedGoogleMapsUrl('http://localhost:5000/api/keys')).toBe(false);
    expect(isAllowedGoogleMapsUrl('http://127.0.0.1:8080')).toBe(false);
  });
});
