import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Search, Phone, Truck, Plus, ShieldCheck, UserCheck, Users, ListFilter } from 'lucide-react';

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  assignedRoute: string;
  status: 'ON_DELIVERY' | 'AVAILABLE' | 'OFF_DUTY';
  completedToday: number;
  rating: number;
}

export const DriversRoster: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const driversList: DriverItem[] = [
    {
      id: 'DRV-101',
      name: 'Ramesh Kumar',
      phone: '+91 98234 11223',
      vehicleNumber: 'MH-12-DV-4421',
      vehicleType: 'Refrigerated Van (1.5 Ton)',
      assignedRoute: 'Route 1 • Central & Camp Area',
      status: 'ON_DELIVERY',
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
      completedToday: 0,
      rating: 4.6,
    },
  ];

  const filteredDrivers = driversList.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.phone.includes(search) ||
      driver.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      driver.assignedRoute.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter;

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
            <span className="metric-value">{driversList.length}</span>
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
              {driversList.filter((d) => d.status === 'ON_DELIVERY').length}
            </span>
            <span className="metric-trend" style={{ color: '#16805D' }}>32 crates en route</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Standby / Available</span>
            <span className="metric-value">
              {driversList.filter((d) => d.status === 'AVAILABLE').length}
            </span>
            <span className="metric-trend" style={{ color: '#B45309' }}>Ready for dispatch</span>
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
                <th>Driver Rating</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <code style={{ fontWeight: 700, fontSize: '12px' }}>{driver.id}</code>
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
                        driver.status === 'ON_DELIVERY'
                          ? 'info'
                          : driver.status === 'AVAILABLE'
                          ? 'success'
                          : 'neutral'
                      }
                    >
                      {driver.status === 'ON_DELIVERY'
                        ? 'On Route'
                        : driver.status === 'AVAILABLE'
                        ? 'Available'
                        : 'Off Duty'}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#C7A75A', fontSize: '13px' }}>
                      ★ {driver.rating.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
