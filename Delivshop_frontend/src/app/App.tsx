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
      <div className="cinematic-login-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div className="status-dot-idle" style={{ margin: '0 auto 16px auto', width: '12px', height: '12px' }} />
          <p style={{ fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em' }}>
            INITIALIZING DELIVSHOP FACILITY CLEARANCE...
          </p>
        </div>
      </div>
    );
  }

  // Authentication gate: unauthenticated users MUST unlock via the 3D cinematic vault experience
  if (!user) {
    return <CinematicLoginExperience />;
  }

  // Authenticated application: real dashboard
  return (
    <Layout activeTab={activeTab} onSelectTab={setActiveTab}>
      {renderTabContent()}
    </Layout>
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
