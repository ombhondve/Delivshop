import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ActiveTab } from '../components/layout/Sidebar';

export interface RouteState {
  path: string;
  search: string;
  activeTab: ActiveTab;
  shopId: string | null;
  companyId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  routeId: string | null;
  isNotFound: boolean;
  isLogin: boolean;
}

interface NavigationContextValue {
  path: string;
  search: string;
  activeTab: ActiveTab;
  shopId: string | null;
  companyId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  routeId: string | null;
  isNotFound: boolean;
  isLogin: boolean;
  navigate: (to: string) => void;
  selectTab: (tab: ActiveTab) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function parsePath(pathname: string): {
  activeTab: ActiveTab;
  shopId: string | null;
  companyId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  routeId: string | null;
  isNotFound: boolean;
  isLogin: boolean;
} {
  // Normalize path by removing trailing slash, keeping leading slash
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // 1. Check Login route
  if (cleanPath === '/login') {
    return {
      activeTab: 'dashboard',
      shopId: null,
      companyId: null,
      driverId: null,
      vehicleId: null,
      routeId: null,
      isNotFound: false,
      isLogin: true,
    };
  }

  // 2. Check /companies/:companyId and /admin/companies/:companyId
  const companyMatch = cleanPath.match(/^(?:\/admin)?\/companies\/([^\/]+)$/);
  if (companyMatch) {
    return {
      activeTab: 'companies',
      shopId: null,
      companyId: decodeURIComponent(companyMatch[1]),
      driverId: null,
      vehicleId: null,
      routeId: null,
      isNotFound: false,
      isLogin: false,
    };
  }

  // 3. Check /shops/:shopId and /admin/shops/:shopId
  const shopMatch = cleanPath.match(/^(?:\/admin)?\/shops\/([^\/]+)$/);
  if (shopMatch) {
    return {
      activeTab: 'shops',
      shopId: decodeURIComponent(shopMatch[1]),
      companyId: null,
      driverId: null,
      vehicleId: null,
      routeId: null,
      isNotFound: false,
      isLogin: false,
    };
  }

  // 4. Check /drivers/:driverId and /admin/drivers/:driverId
  const driverMatch = cleanPath.match(/^(?:\/admin)?\/drivers\/([^\/]+)$/);
  if (driverMatch) {
    return {
      activeTab: 'drivers',
      shopId: null,
      companyId: null,
      driverId: decodeURIComponent(driverMatch[1]),
      vehicleId: null,
      routeId: null,
      isNotFound: false,
      isLogin: false,
    };
  }

  // 5. Check /vehicles/:vehicleId and /admin/vehicles/:vehicleId
  const vehicleMatch = cleanPath.match(/^(?:\/admin)?\/vehicles\/([^\/]+)$/);
  if (vehicleMatch) {
    return {
      activeTab: 'vehicles',
      shopId: null,
      companyId: null,
      driverId: null,
      vehicleId: decodeURIComponent(vehicleMatch[1]),
      routeId: null,
      isNotFound: false,
      isLogin: false,
    };
  }

  // 6. Check /routes/:routeId and /admin/routes/:routeId
  const routeMatch = cleanPath.match(/^(?:\/admin)?\/routes\/([^\/]+)$/);
  if (routeMatch) {
    return {
      activeTab: 'routes',
      shopId: null,
      companyId: null,
      driverId: null,
      vehicleId: null,
      routeId: decodeURIComponent(routeMatch[1]),
      isNotFound: false,
      isLogin: false,
    };
  }

  // 6. Check standard section routes (supports both /<section> and /admin/<section>)
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
    '/shop-orders': 'shop-orders',
    '/admin/shop-orders': 'shop-orders',
    '/deliveries': 'deliveries',
    '/admin/deliveries': 'deliveries',
    '/drivers': 'drivers',
    '/admin/drivers': 'drivers',
    '/vehicles': 'vehicles',
    '/admin/vehicles': 'vehicles',
    '/routes': 'routes',
    '/admin/routes': 'routes',
    '/assignments': 'assignments',
    '/admin/assignments': 'assignments',
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
      driverId: null,
      vehicleId: null,
      routeId: null,
      isNotFound: false,
      isLogin: false,
    };
  }

  // 8. Unknown route -> Not Found
  return {
    activeTab: 'dashboard',
    shopId: null,
    companyId: null,
    driverId: null,
    vehicleId: null,
    routeId: null,
    isNotFound: true,
    isLogin: false,
  };
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [currentSearch, setCurrentSearch] = useState<string>(() => window.location.search || '');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setCurrentSearch(window.location.search || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const routeDetails = useMemo(() => parsePath(currentPath), [currentPath]);

  const navigate = (to: string) => {
    const targetUrl = new URL(to, window.location.origin);
    const targetPath = targetUrl.pathname || '/';
    const targetSearch = targetUrl.search || '';

    if (targetPath !== window.location.pathname || targetSearch !== window.location.search) {
      window.history.pushState(null, '', to);
      setCurrentPath(targetPath);
      setCurrentSearch(targetSearch);
      window.scrollTo(0, 0);
    }
  };

  const selectTab = (tab: ActiveTab) => {
    // Navigate using the standard /admin/:tab route convention
    const targetPath = tab === 'dashboard' ? '/admin/dashboard' : `/admin/${tab}`;
    navigate(targetPath);
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/admin/dashboard');
    }
  };

  const value: NavigationContextValue = {
    path: currentPath,
    search: currentSearch,
    activeTab: routeDetails.activeTab,
    shopId: routeDetails.shopId,
    companyId: routeDetails.companyId,
    driverId: routeDetails.driverId,
    vehicleId: routeDetails.vehicleId,
    routeId: routeDetails.routeId,
    isNotFound: routeDetails.isNotFound,
    isLogin: routeDetails.isLogin,
    navigate,
    selectTab,
    goBack,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextValue => {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return ctx;
};
