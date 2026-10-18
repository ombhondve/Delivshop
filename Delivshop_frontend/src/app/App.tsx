import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { NavigationProvider, useNavigation } from '../context/NavigationContext';
import { Layout } from '../components/layout/Layout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CompanyOverview } from '../features/companies/CompanyOverview';
import { CompanyDetailPage } from '../features/companies/CompanyDetailPage';
import { ShopOverview } from '../features/shops/ShopOverview';
import { ShopDetailPage } from '../features/shops/ShopDetailPage';
import { ProductCatalog } from '../features/products/ProductCatalog';
import { OrdersList } from '../features/orders/OrdersList';
import { ShopOrdersDispatchPage } from '../features/orders/ShopOrdersDispatchPage';
import { DeliveriesTracking } from '../features/deliveries/DeliveriesTracking';
import { ReportsSummary } from '../features/reports/ReportsSummary';
import { DriversRoster } from '../features/drivers/DriversRoster';
import { CollectionsLedger } from '../features/collections/CollectionsLedger';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from '../components/layout/NotFoundPage';
import { CinematicLoginExperience } from '../features/auth/locker/CinematicLoginExperience';
import { DriverDetailPage } from '../features/drivers/DriverDetailPage';
import { VehicleDetailPage } from '../features/vehicles/VehicleDetailPage';

import { VehiclesOverview } from '../features/vehicles/VehiclesOverview';
import { RoutesOverview } from '../features/routes/RoutesOverview';
import { AssignmentsOverview } from '../features/assignments/AssignmentsOverview';

const MainContent: React.FC = () => {
  const { path, activeTab, selectTab, shopId, companyId, driverId, vehicleId, isNotFound, isLogin, navigate } = useNavigation();
  const { user, loading } = useAuth();

  // If unauthenticated and on a protected route, safely redirect to /login?redirect=...
  useEffect(() => {
    if (!loading && !user && !isLogin) {
      const destination = path + window.location.search;
      const safeDestination =
        destination.startsWith('/') && !destination.startsWith('//') && !destination.includes('://')
          ? destination
          : '/admin/dashboard';
      navigate(`/login?redirect=${encodeURIComponent(safeDestination)}`);
    }
  }, [loading, user, isLogin, path, navigate]);

  // If already authenticated and visiting /login directly, redirect to /admin/dashboard
  useEffect(() => {
    if (!loading && user && isLogin) {
      navigate('/admin/dashboard');
    }
  }, [loading, user, isLogin, navigate]);

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

  const renderTabContent = () => {
    if (isNotFound) {
      return <NotFoundPage />;
    }

    // Dedicated Company Details page when route is /companies/:companyId or /admin/companies/:companyId
    if (activeTab === 'companies' && companyId) {
      return <CompanyDetailPage companyId={companyId} />;
    }

    // Dedicated Shop Details page when route is /shops/:shopId or /admin/shops/:shopId
    if (activeTab === 'shops' && shopId) {
      return <ShopDetailPage shopId={shopId} />;
    }

    // Dedicated Driver Details page when route is /drivers/:driverId or /admin/drivers/:driverId
    if (activeTab === 'drivers' && driverId) {
      return <DriverDetailPage driverId={driverId} />;
    }

    // Dedicated Vehicle Details page when route is /vehicles/:vehicleId or /admin/vehicles/:vehicleId
    if (activeTab === 'vehicles' && vehicleId) {
      return <VehicleDetailPage vehicleId={vehicleId} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'drivers':
        return <DriversRoster />;
      case 'vehicles':
        return <VehiclesOverview />;
      case 'routes':
        return <RoutesOverview onDispatchRun={() => selectTab('assignments')} />;
      case 'assignments':
        return <AssignmentsOverview />;
      case 'companies':
        return <CompanyOverview />;
      case 'shops':
        return <ShopOverview />;
      case 'products':
        return <ProductCatalog />;
      case 'orders':
        return <OrdersList />;
      case 'shop-orders':
        return <ShopOrdersDispatchPage />;
      case 'deliveries':
        return <DeliveriesTracking />;
      case 'collections':
        return <CollectionsLedger />;
      case 'reports':
        return <ReportsSummary />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <NotFoundPage />;
    }
  };

  // Authenticated application: smooth entrance transition into dashboard
  return (
    <div className="dashboard-entrance-wrapper">
      <Layout activeTab={activeTab} onSelectTab={selectTab}>
        {renderTabContent()}
      </Layout>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationProvider>
        <MainContent />
      </NavigationProvider>
    </AuthProvider>
  );
};

export default App;
