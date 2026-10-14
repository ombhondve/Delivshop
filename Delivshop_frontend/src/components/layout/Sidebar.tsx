import React from 'react';

export type ActiveTab = 'dashboard' | 'shops' | 'products' | 'orders' | 'deliveries' | 'reports';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'shops', label: 'Shops Overview', icon: '🏪' },
    { id: 'products', label: 'Products', icon: '🏷️' },
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'deliveries', label: 'Deliveries', icon: '🚚' },
    { id: 'reports', label: 'Audit & Reports', icon: '📑' },
  ];

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};
