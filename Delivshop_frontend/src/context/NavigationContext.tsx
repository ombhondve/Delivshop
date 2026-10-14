import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ActiveTab } from '../components/layout/Sidebar';

export interface RouteState {
  path: string;
  activeTab: ActiveTab;
  shopId: string | null;
}

interface NavigationContextValue {
  path: string;
  activeTab: ActiveTab;
  shopId: string | null;
  navigate: (to: string) => void;
  selectTab: (tab: ActiveTab) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

function parsePath(pathname: string): { activeTab: ActiveTab; shopId: string | null } {
  // Normalize path
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // Check /shops/:shopId
  const shopMatch = cleanPath.match(/^\/shops\/([^\/]+)$/);
  if (shopMatch) {
    return {
      activeTab: 'shops',
      shopId: decodeURIComponent(shopMatch[1]),
    };
  }

  // Check standard tab routes
  if (cleanPath === '/shops') return { activeTab: 'shops', shopId: null };
  if (cleanPath === '/products') return { activeTab: 'products', shopId: null };
  if (cleanPath === '/orders') return { activeTab: 'orders', shopId: null };
  if (cleanPath === '/deliveries') return { activeTab: 'deliveries', shopId: null };
  if (cleanPath === '/drivers') return { activeTab: 'drivers', shopId: null };
  if (cleanPath === '/collections') return { activeTab: 'collections', shopId: null };
  if (cleanPath === '/reports') return { activeTab: 'reports', shopId: null };
  if (cleanPath === '/settings') return { activeTab: 'settings', shopId: null };
  if (cleanPath === '/' || cleanPath === '/dashboard') return { activeTab: 'dashboard', shopId: null };

  // Default fallback
  return { activeTab: 'dashboard', shopId: null };
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const { activeTab, shopId } = useMemo(() => parsePath(currentPath), [currentPath]);

  const navigate = (to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState(null, '', to);
      setCurrentPath(to);
      window.scrollTo(0, 0);
    }
  };

  const selectTab = (tab: ActiveTab) => {
    const targetPath = tab === 'dashboard' ? '/' : `/${tab}`;
    navigate(targetPath);
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/shops');
    }
  };

  const value = {
    path: currentPath,
    activeTab,
    shopId,
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
