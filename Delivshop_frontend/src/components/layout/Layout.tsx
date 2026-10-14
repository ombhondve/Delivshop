import React from 'react';
import { Header } from './Header';
import { Sidebar, ActiveTab } from './Sidebar';

interface LayoutProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, onSelectTab, children }) => {
  return (
    <div className="layout-root">
      <Header />
      <div className="layout-body">
        <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />
        <main className="layout-content">{children}</main>
      </div>
    </div>
  );
};
