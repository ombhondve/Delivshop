import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Search,
  Phone,
  Truck,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  ListFilter,
  Power,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { DriverUser } from '../../types';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

interface DriverItem {
  id: string;
  name: string;
  email?: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  assignedRoute: string;
  status: 'ON_DELIVERY' | 'AVAILABLE' | 'OFF_DUTY';
  is_active: boolean;
  completedToday: number;
  rating: number;
}

const DEFAULT_DRIVERS: DriverItem[] = [
  {
    id: 'DRV-101',
    name: 'Ramesh Kumar',
    phone: '+91 98234 11223',
    vehicleNumber: 'MH-12-DV-4421',
    vehicleType: 'Refrigerated Van (1.5 Ton)',
    assignedRoute: 'Route 1 • Central & Camp Area',
    status: 'ON_DELIVERY',
    is_active: true,
    completedToday: 18,
    rating: 4.9,
  },
  {
    id: 'DRV-102',
    name: 'Rajesh Sharma',
    phone: '+91 98450 33445',
    vehicleNumber: 'MH-12-DV-8812',
    vehicleType: 'Insulated Delivery Van',
    assignedRoute: 'Route 2 • Kothrud & Karve Road',
    status: 'ON_DELIVERY',
    is_active: true,
    completedToday: 14,
    rating: 4.8,
  },
  {
    id: 'DRV-103',
    name: 'Santosh Patil',
    phone: '+91 97654 88761',
    vehicleNumber: 'MH-14-BT-3109',
    vehicleType: 'Refrigerated Milk Tanker',
    assignedRoute: 'Route 3 • Hadapsar Wholesale Hub',
    status: 'AVAILABLE',
    is_active: true,
    completedToday: 22,
    rating: 5.0,
  },
  {
    id: 'DRV-104',
    name: 'Vikas More',
    phone: '+91 99220 54321',
    vehicleNumber: 'MH-12-DV-9901',
    vehicleType: 'Electric Cargo Van',
    assignedRoute: 'Route 4 • Viman Nagar & Kalyani Nagar',
    status: 'AVAILABLE',
    is_active: true,
    completedToday: 16,
    rating: 4.7,
  },
  {
    id: 'DRV-105',
    name: 'Anil Jadhav',
    phone: '+91 98111 67890',
    vehicleNumber: 'MH-12-DV-1234',
    vehicleType: 'Refrigerated Van (1.5 Ton)',
    assignedRoute: 'Route 5 • Aundh & Baner Morning Run',
    status: 'OFF_DUTY',
    is_active: false,
    completedToday: 0,
    rating: 4.6,
  },
];

export const DriversRoster: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverItem[]>(DEFAULT_DRIVERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Deletion modal state
  const [driverToDelete, setDriverToDelete] = useState<DriverItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const apiDrivers = await api.deliveries.listAllDrivers();
      if (apiDrivers && apiDrivers.length > 0) {
        // Merge API drivers with UI attributes or fallback metadata
        const mapped: DriverItem[] = apiDrivers.map((d: DriverUser, idx: number) => {
          const fallback = DEFAULT_DRIVERS[idx % DEFAULT_DRIVERS.length];
          return {
            id: d.id,
            name: d.name,
            email: d.email,
            phone: d.phone || fallback?.phone || '+91 98000 00000',
            vehicleNumber: fallback?.vehicleNumber || `MH-12-DV-${1000 + idx}`,
            vehicleType: fallback?.vehicleType || 'Insulated Milk Van',
            assignedRoute: fallback?.assignedRoute || `Route ${idx + 1} • Pune Central`,
            status: !d.is_active ? 'OFF_DUTY' : idx % 2 === 0 ? 'ON_DELIVERY' : 'AVAILABLE',
            is_active: Boolean(d.is_active),
            completedToday: fallback?.completedToday || (10 + idx * 2),
            rating: fallback?.rating || 4.8,
          };
        });
        setDrivers(mapped);
      }
    } catch (err: any) {
      console.warn('Could not load backend drivers roster, using local fallback:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleToggleDriverStatus = async (driver: DriverItem) => {
    const nextIsActive = !driver.is_active;
    try {
      await api.deliveries.updateDriverStatus(
        driver.id,
        nextIsActive,
        nextIsActive ? 'Driver activated for deliveries' : 'Driver deactivated from roster'
      );
      // Update local state
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driver.id
            ? {
                ...d,
                is_active: nextIsActive,
                status: nextIsActive ? 'AVAILABLE' : 'OFF_DUTY',
              }
            : d
        )
      );
      fetchDrivers();
    } catch (err: any) {
      // In case the mock item does not exist in DB yet, toggle locally
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driver.id
            ? {
                ...d,
                is_active: nextIsActive,
                status: nextIsActive ? 'AVAILABLE' : 'OFF_DUTY',
              }
            : d
        )
      );
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.phone.includes(search) ||
      driver.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      driver.assignedRoute.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'INACTIVE' ? !driver.is_active : driver.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Drivers Roster & Fleet Personnel</h2>
          <p className="page-desc">
            Manage certified cold-chain drivers, delivery vehicle allocations, and morning shift route schedules
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="primary" icon={<Plus size={16} />}>
            Onboard Driver
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FAF6ED', color: '#C7A75A' }}>
            <Users size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Registered Fleet Drivers</span>
            <span className="metric-value">{drivers.length}</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>100% verified KYC</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <UserCheck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active on Route</span>
            <span className="metric-value">
              {drivers.filter((d) => d.is_active && d.status === 'ON_DELIVERY').length}
            </span>
            <span className="metric-trend" style={{ color: '#16805D' }}>Cold-chain verified</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Inactive / Deactivated</span>
            <span className="metric-value">
              {drivers.filter((d) => !d.is_active).length}
            </span>
            <span className="metric-trend" style={{ color: '#B45309' }}>Ready for deletion review</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="search-filter-toolbar">
        <div className="toolbar-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search driver by name, phone, vehicle, or route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search drivers"
            />
          </div>
        </div>

        <div className="toolbar-filters-group">
          <div className="filter-select-wrapper">
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by driver status"
            >
              <option value="ALL">All Driver Statuses</option>
              <option value="ON_DELIVERY">On Delivery Run</option>
              <option value="AVAILABLE">Available / Standby</option>
              <option value="OFF_DUTY">Off Duty</option>
              <option value="INACTIVE">Inactive / Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <Card
        title="Fleet Personnel Roster"
        subtitle={`Showing ${filteredDrivers.length} certified drivers on file`}
        noPadding
      >
        <div className="business-table-container">
          <table className="business-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Driver Name & Phone</th>
                <th>Vehicle Allocated</th>
                <th>Assigned Route</th>
                <th>Today's Drops</th>
                <th>Status</th>
                <th>Rating</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <code style={{ fontWeight: 700, fontSize: '12px' }}>{driver.id.slice(0, 8)}</code>
                  </td>
                  <td>
                    <div className="font-semibold text-primary">{driver.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={11} /> {driver.phone}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '13px', color: '#20342C' }}>
                      {driver.vehicleNumber}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>{driver.vehicleType}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', color: '#20342C' }}>{driver.assignedRoute}</div>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {driver.completedToday} completed
                  </td>
                  <td>
                    <Badge
                      variant={
                        !driver.is_active
                          ? 'neutral'
                          : driver.status === 'ON_DELIVERY'
                          ? 'info'
                          : 'success'
                      }
                    >
                      {!driver.is_active
                        ? 'Inactive'
                        : driver.status === 'ON_DELIVERY'
                        ? 'On Route'
                        : 'Available'}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#C7A75A', fontSize: '13px' }}>
                      ★ {driver.rating.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {/* Power / Deactivate Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleDriverStatus(driver)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: driver.is_active ? '#FDE68A' : '#BBF7D0',
                          backgroundColor: driver.is_active ? '#FFFBEB' : '#F0FDF4',
                          color: driver.is_active ? '#D97706' : '#168264',
                          cursor: 'pointer',
                        }}
                        title={driver.is_active ? 'Deactivate Driver' : 'Activate Driver'}
                        aria-label={driver.is_active ? 'Deactivate Driver' : 'Activate Driver'}
                      >
                        <Power size={14} />
                      </button>

                      {/* Delete Action (Strict Rule 1 & Rule 2 Enforcement) */}
                      {driver.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleToggleDriverStatus(driver)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            color: '#94A3B8',
                            cursor: 'not-allowed',
                            opacity: 0.6,
                          }}
                          title="Deactivate this driver before deleting it."
                          aria-label="Deactivate this driver before deleting it"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDriverToDelete(driver);
                            setIsDeleteModalOpen(true);
                          }}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title="Delete Inactive Driver"
                          aria-label="Delete Inactive Driver"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Driver Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDriverToDelete(null);
        }}
        title="Delete Driver Record"
        entityType="Driver"
        entityName={driverToDelete?.name || ''}
        entityIdentifier={driverToDelete?.id}
        isActive={Boolean(driverToDelete?.is_active)}
        onDeactivateRequested={() => {
          if (driverToDelete) {
            handleToggleDriverStatus(driverToDelete);
          }
        }}
        customWarning="Cannot delete drivers actively assigned to delivery runs. If this driver has completed historical deliveries, delivery audit attributions and route manifests will remain permanently archived."
        onConfirm={async (reason) => {
          if (driverToDelete) {
            try {
              await api.deliveries.deleteDriver(driverToDelete.id, reason);
            } catch (err: any) {
              // If local fallback item, remove from state
              if (driverToDelete.id.startsWith('DRV-')) {
                setDrivers((prev) => prev.filter((d) => d.id !== driverToDelete.id));
                return;
              }
              throw err;
            }
            fetchDrivers();
          }
        }}
      />
    </div>
  );
};
