import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { Layout } from '../components/layout/Layout';
import { ActiveTab } from '../components/layout/Sidebar';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ShopOverview } from '../features/shops/ShopOverview';
import { ProductCatalog } from '../features/products/ProductCatalog';
import { OrdersList } from '../features/orders/OrdersList';
import { DeliveriesTracking } from '../features/deliveries/DeliveriesTracking';
import { ReportsSummary } from '../features/reports/ReportsSummary';
import { DriversRoster } from '../features/drivers/DriversRoster';
import { CollectionsLedger } from '../features/collections/CollectionsLedger';
import { SettingsPage } from '../features/settings/SettingsPage';
import { CinematicLoginExperience } from '../features/auth/locker/CinematicLoginExperience';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { user, loading } = useAuth();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'shops':
        return <ShopOverview />;
      case 'products':
        return <ProductCatalog />;
      case 'orders':
        return <OrdersList />;
      case 'deliveries':
        return <DeliveriesTracking />;
      case 'drivers':
        return <DriversRoster />;
      case 'collections':
        return <CollectionsLedger />;
      case 'reports':
        return <ReportsSummary />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  // While checking existing session token with backend:
  if (loading) {
    return (
      <div className="login-screen-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div className="status-dot-idle" style={{ margin: '0 auto 16px auto', width: '12px', height: '12px' }} />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#20342C' }}>
            Connecting to Delivshop Facility...
          </p>
        </div>
      </div>
    );
  }

  // Authentication gate: unauthenticated users enter via Palette 9 login screen
  if (!user) {
    return <CinematicLoginExperience />;
  }

  // Authenticated application: smooth entrance transition into dashboard
  return (
    <div className="dashboard-entrance-wrapper">
      <Layout activeTab={activeTab} onSelectTab={setActiveTab}>
        {renderTabContent()}
      </Layout>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

export default App;
