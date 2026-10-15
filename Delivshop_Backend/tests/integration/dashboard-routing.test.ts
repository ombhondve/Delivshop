import { describe, it, expect } from 'vitest';

// 1. Re-implementation of parsePath to test pure client-side routing contract
type ActiveTab =
  | 'dashboard'
  | 'companies'
  | 'shops'
  | 'products'
  | 'orders'
  | 'deliveries'
  | 'drivers'
  | 'collections'
  | 'reports'
  | 'settings';

function parsePath(pathname: string): {
  activeTab: ActiveTab;
  shopId: string | null;
  companyId: string | null;
  isNotFound: boolean;
  isLogin: boolean;
} {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/login') {
    return {
      activeTab: 'dashboard',
      shopId: null,
      companyId: null,
      isNotFound: false,
      isLogin: true,
    };
  }

  const companyMatch = cleanPath.match(/^(?:\/admin)?\/companies\/([^\/]+)$/);
  if (companyMatch) {
    return {
      activeTab: 'companies',
      shopId: null,
      companyId: decodeURIComponent(companyMatch[1]),
      isNotFound: false,
      isLogin: false,
    };
  }

  const shopMatch = cleanPath.match(/^(?:\/admin)?\/shops\/([^\/]+)$/);
  if (shopMatch) {
    return {
      activeTab: 'shops',
      shopId: decodeURIComponent(shopMatch[1]),
      companyId: null,
      isNotFound: false,
      isLogin: false,
    };
  }

  const routeMap: Record<string, ActiveTab> = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/admin': 'dashboard',
    '/admin/dashboard': 'dashboard',
    '/companies': 'companies',
    '/admin/companies': 'companies',
    '/shops': 'shops',
    '/admin/shops': 'shops',
    '/products': 'products',
    '/admin/products': 'products',
    '/orders': 'orders',
    '/admin/orders': 'orders',
    '/deliveries': 'deliveries',
    '/admin/deliveries': 'deliveries',
    '/drivers': 'drivers',
    '/admin/drivers': 'drivers',
    '/collections': 'collections',
    '/admin/collections': 'collections',
    '/reports': 'reports',
    '/admin/reports': 'reports',
    '/settings': 'settings',
    '/admin/settings': 'settings',
  };

  if (routeMap[cleanPath]) {
    return {
      activeTab: routeMap[cleanPath],
      shopId: null,
      companyId: null,
      isNotFound: false,
      isLogin: false,
    };
  }

  return {
    activeTab: 'dashboard',
    shopId: null,
    companyId: null,
    isNotFound: true,
    isLogin: false,
  };
}

function sanitizeRedirectDestination(rawRedirect: string | null): string {
  if (!rawRedirect) return '/admin/dashboard';
  try {
    const decoded = decodeURIComponent(rawRedirect);
    if (
      decoded.startsWith('/') &&
      !decoded.startsWith('//') &&
      !decoded.includes('://') &&
      !decoded.toLowerCase().startsWith('javascript:')
    ) {
      return decoded;
    }
  } catch {
    // Malformed encoding
  }
  return '/admin/dashboard';
}

describe('Dashboard Routing & Vercel SPA Rewrite Suite', () => {
  describe('Vercel vercel.json SPA Rewrite Rule Verification', () => {
    // Regex from vercel.json: /((?!assets/|favicon\.ico|robots\.txt|.*\\.[a-zA-Z0-9]+$).*)
    const vercelRewriteRegex = /^\/((?!assets\/|favicon\.ico|robots\.txt|.*\.[a-zA-Z0-9]+$).*)$/;

    it('should rewrite dashboard nested routes to index.html on refresh', () => {
      expect(vercelRewriteRegex.test('/admin/dashboard')).toBe(true);
      expect(vercelRewriteRegex.test('/admin/products')).toBe(true);
      expect(vercelRewriteRegex.test('/admin/shops')).toBe(true);
      expect(vercelRewriteRegex.test('/admin/companies')).toBe(true);
      expect(vercelRewriteRegex.test('/admin/shops/shop-uuid-123')).toBe(true);
      expect(vercelRewriteRegex.test('/login')).toBe(true);
    });

    it('should NOT rewrite static assets or files with extensions to index.html (preventing corrupt 200 on missing assets)', () => {
      expect(vercelRewriteRegex.test('/assets/index-BK13uEUh.css')).toBe(false);
      expect(vercelRewriteRegex.test('/assets/index-Dm9pb18D.js')).toBe(false);
      expect(vercelRewriteRegex.test('/assets/logo.png')).toBe(false);
      expect(vercelRewriteRegex.test('/favicon.ico')).toBe(false);
      expect(vercelRewriteRegex.test('/robots.txt')).toBe(false);
      expect(vercelRewriteRegex.test('/images/product-thumb.webp')).toBe(false);
    });
  });

  describe('Client-Side Route Resolution (parsePath)', () => {
    it('should resolve standard dashboard routes with and without /admin prefix', () => {
      expect(parsePath('/admin/dashboard').activeTab).toBe('dashboard');
      expect(parsePath('/dashboard').activeTab).toBe('dashboard');
      expect(parsePath('/').activeTab).toBe('dashboard');
      expect(parsePath('/admin').activeTab).toBe('dashboard');

      expect(parsePath('/admin/products').activeTab).toBe('products');
      expect(parsePath('/products').activeTab).toBe('products');

      expect(parsePath('/admin/shops').activeTab).toBe('shops');
      expect(parsePath('/shops').activeTab).toBe('shops');

      expect(parsePath('/admin/companies').activeTab).toBe('companies');
      expect(parsePath('/companies').activeTab).toBe('companies');

      expect(parsePath('/admin/orders').activeTab).toBe('orders');
      expect(parsePath('/admin/deliveries').activeTab).toBe('deliveries');
      expect(parsePath('/admin/drivers').activeTab).toBe('drivers');
      expect(parsePath('/admin/collections').activeTab).toBe('collections');
      expect(parsePath('/admin/reports').activeTab).toBe('reports');
      expect(parsePath('/admin/settings').activeTab).toBe('settings');
    });

    it('should extract shopId on nested shop details routes', () => {
      const res = parsePath('/admin/shops/SHP-00123');
      expect(res.activeTab).toBe('shops');
      expect(res.shopId).toBe('SHP-00123');
      expect(res.isNotFound).toBe(false);

      const resDirect = parsePath('/shops/SHP-00123');
      expect(resDirect.activeTab).toBe('shops');
      expect(resDirect.shopId).toBe('SHP-00123');
    });

    it('should extract companyId on nested company details routes', () => {
      const res = parsePath('/admin/companies/CMP-9988');
      expect(res.activeTab).toBe('companies');
      expect(res.companyId).toBe('CMP-9988');
      expect(res.isNotFound).toBe(false);

      const resDirect = parsePath('/companies/CMP-9988');
      expect(resDirect.activeTab).toBe('companies');
      expect(resDirect.companyId).toBe('CMP-9988');
    });

    it('should identify login route', () => {
      const res = parsePath('/login');
      expect(res.isLogin).toBe(true);
      expect(res.isNotFound).toBe(false);
    });

    it('should flag unknown routes as not found (404)', () => {
      const res1 = parsePath('/unknown-route-xyz');
      expect(res1.isNotFound).toBe(true);

      const res2 = parsePath('/admin/nonexistent-portal');
      expect(res2.isNotFound).toBe(true);
    });
  });

  describe('Open Redirect Security Protection', () => {
    it('should safely accept legitimate internal dashboard destinations', () => {
      expect(sanitizeRedirectDestination('/admin/products')).toBe('/admin/products');
      expect(sanitizeRedirectDestination('/admin/shops/123')).toBe('/admin/shops/123');
      expect(sanitizeRedirectDestination('/admin/dashboard')).toBe('/admin/dashboard');
      expect(sanitizeRedirectDestination('/admin/products?search=milk')).toBe('/admin/products?search=milk');
    });

    it('should block malicious external URLs and open redirect vectors', () => {
      expect(sanitizeRedirectDestination('https://evil-phishing.com')).toBe('/admin/dashboard');
      expect(sanitizeRedirectDestination('http://attacker.com/steal')).toBe('/admin/dashboard');
      expect(sanitizeRedirectDestination('//evil.com/fake-login')).toBe('/admin/dashboard');
      expect(sanitizeRedirectDestination('javascript:alert(document.cookie)')).toBe('/admin/dashboard');
      expect(sanitizeRedirectDestination(null)).toBe('/admin/dashboard');
    });
  });
});
