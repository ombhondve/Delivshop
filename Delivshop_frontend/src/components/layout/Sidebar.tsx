import {
  LayoutDashboard,
  Users,
  Truck,
  MapPin,
  CalendarCheck,
  Store,
  FileText,
  Shield,
  Building2,
  Package,
  ClipboardList,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Milk,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export type ActiveTab =
  | 'dashboard'
  | 'drivers'
  | 'vehicles'
  | 'routes'
  | 'assignments'
  | 'shops'
  | 'reports'
  | 'settings'
  | 'companies'
  | 'products'
  | 'orders'
  | 'shop-orders'
  | 'deliveries'
  | 'collections';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const primaryNavItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    { id: 'drivers', label: 'Drivers', icon: <Users size={19} /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Truck size={19} /> },
    { id: 'routes', label: 'Routes', icon: <MapPin size={19} /> },
    { id: 'assignments', label: 'Assignments', icon: <CalendarCheck size={19} /> },
    { id: 'shops', label: 'Shops', icon: <Store size={19} /> },
    { id: 'reports', label: 'Reports', icon: <FileText size={19} /> },
    { id: 'settings', label: 'Settings & Security', icon: <Shield size={19} /> },
  ];

  const secondaryNavItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'companies', label: 'Companies', icon: <Building2 size={18} /> },
    { id: 'products', label: 'Products & Stock', icon: <Package size={18} /> },
    { id: 'orders', label: 'Orders Dispatch', icon: <ClipboardList size={18} /> },
    { id: 'shop-orders', label: 'Shop Orders & Dispatch', icon: <Milk size={18} /> },
    { id: 'collections', label: 'Payments & Ledger', icon: <Wallet size={18} /> },
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    onSelectTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        className={`app-sidebar ${isCollapsed ? 'is-collapsed' : ''} ${
          isMobileOpen ? 'is-mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-brand-container">
          <div className="sidebar-brand">
            <div className="brand-logo-icon">
              <Milk size={20} className="text-white" />
            </div>
            {!isCollapsed && (
              <div className="brand-text-block">
                <span className="brand-name">DELIVSHOP</span>
                <span className="brand-tagline">DAIRY DISTRIBUTION</span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation List */}
        <div className="sidebar-nav-wrapper">
          <nav className="sidebar-nav">
            {!isCollapsed && <div className="nav-section-title">CORE FLEET & LOGISTICS</div>}
            {primaryNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="nav-icon-container">{item.icon}</span>
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span className="nav-badge-count">{item.badge}</span>
                  )}
                </button>
              );
            })}

            {!isCollapsed && (
              <div className="nav-section-title" style={{ marginTop: '16px' }}>
                DAIRY COMMERCE
              </div>
            )}
            {secondaryNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="nav-icon-container">{item.icon}</span>
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="sidebar-collapse-container">
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>

        {/* User Mini Profile Footer */}
        {user && (
          <div className="sidebar-user-footer">
            <div className="user-avatar-circle" title={user.name}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            {!isCollapsed && (
              <div className="user-info-text">
                <span className="user-display-name">{user.name}</span>
                <span className="user-role-label">{user.role}</span>
              </div>
            )}
            {!isCollapsed && (
              <button
                type="button"
                className="user-logout-quick-btn"
                onClick={() => logout()}
                title="Sign out of portal"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
