import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, ActiveTab } from './Sidebar';

interface LayoutProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, onSelectTab, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className={`layout-root ${isCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="layout-main-column">
        <Header
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
        />
        <main className="layout-content-area" role="main">
          {children}
        </main>
      </div>
    </div>
  );
};
