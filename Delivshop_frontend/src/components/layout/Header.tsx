import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../context/NavigationContext';
import { ActiveTab } from './Sidebar';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Menu, LogOut, CheckCircle2, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { shopId, isNotFound } = useNavigation();

  const tabTitles: Record<ActiveTab, { title: string; category: string }> = {
    dashboard: { title: 'Operational Dashboard', category: 'Overview' },
    drivers: { title: 'Drivers Roster', category: 'Fleet Personnel' },
    vehicles: { title: 'Fleet & Vehicles', category: 'Logistics Asset Management' },
    routes: { title: 'Sequenced Routes', category: 'Route Optimization' },
    assignments: { title: 'Assignments & Dispatch', category: 'Daily Delivery Runs' },
    companies: { title: 'Company Management', category: 'Core Operations' },
    shops: { title: 'Shop Management', category: 'Distribution Network' },
    products: { title: 'Products & Inventory', category: 'Catalog Management' },
    orders: { title: 'Orders Dispatch', category: 'Order Fulfillment' },
    deliveries: { title: 'Delivery Fleet', category: 'Logistics Tracking' },
    collections: { title: 'Payments & Ledger', category: 'Finance & Invoicing' },
    reports: { title: 'Audit & Reports', category: 'System Compliance' },
    settings: { title: 'System Settings', category: 'Configuration' },
  };

  const currentTabInfo = isNotFound
    ? { title: 'Page Not Found', category: '404 Error' }
    : shopId
    ? { title: 'Shop Details', category: 'Distribution Network' }
    : tabTitles[activeTab] || {
        title: 'Operations Portal',
        category: 'Dashboard',
      };

  return (
    <header className="app-header">
      {/* Left side: Mobile menu toggle + Breadcrumbs */}
      <div className="header-left-group">
        <button
          type="button"
          className="mobile-menu-toggle-btn"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="header-breadcrumbs">
          <span className="breadcrumb-category">{currentTabInfo.category}</span>
          <span className="breadcrumb-separator">/</span>
          <h1 className="breadcrumb-title">{currentTabInfo.title}</h1>
        </div>
      </div>

      {/* Right side: API Status + User profile + Logout */}
      <div className="header-right-group">
        {/* Live Status indicator */}
        <div className="header-status-pill" title="Backend API operational and verified">
          <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
          <span className="status-pill-text">API Online</span>
        </div>

        {/* User Profile */}
        {user && (
          <div className="header-user-container">
            <div className="header-user-badge">
              <div className="header-avatar-circle">
                <UserIcon size={14} />
              </div>
              <div className="header-user-details">
                <span className="header-user-name">{user.name}</span>
                <Badge variant="neutral" size="sm">
                  {user.role}
                </Badge>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<LogOut size={14} />}
              onClick={() => logout()}
              className="header-logout-btn"
              title="Sign out of portal"
            >
              <span>Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
