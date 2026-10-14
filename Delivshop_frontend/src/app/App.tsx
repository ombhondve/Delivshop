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
import { LoginPage } from '../features/auth/LoginPage';
import { Button } from '../components/common/Button';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useAuth();

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
      case 'reports':
        return <ReportsSummary />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} onSelectTab={setActiveTab}>
      {!user && (
        <div className="login-banner">
          <div>
            <strong>Guest Mode:</strong> You are viewing read-only demo data. Authenticate to test backend API roles.
          </div>
          <Button size="sm" onClick={() => setShowLoginModal(!showLoginModal)}>
            {showLoginModal ? 'Close Form' : 'Sign In'}
          </Button>
        </div>
      )}

      {showLoginModal && !user ? (
        <div className="mb-6">
          <LoginPage />
        </div>
      ) : null}

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
