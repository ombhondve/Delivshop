import React, { useState } from 'react';
import {
  Truck,
  Search,
  ListFilter,
  MapPin,
  Clock,
  ThermometerSnowflake,
  CheckCircle2,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

interface DeliveryRun {
  id: string;
  routeCode: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  vehicleNo: string;
  vehicleType: string;
  temperatureCelsius: number;
  totalDrops: number;
  completedDrops: number;
  currentShop: string;
  eta: string;
  status: 'EN_ROUTE' | 'COMPLETED' | 'STANDBY' | 'DELAYED';
}

export const DeliveriesTracking: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const deliveryRuns: DeliveryRun[] = [
    {
      id: 'del_101',
      routeCode: 'RT-A01',
      routeName: 'Shivajinagar & Model Colony Run',
      driverName: 'Ramesh Powar',
      driverPhone: '+91 98221 44510',
      vehicleNo: 'MH-12-RN-4821',
      vehicleType: 'Tata Ace Reefer Cold-Box',
      temperatureCelsius: 3.8,
      totalDrops: 8,
      completedDrops: 7,
      currentShop: 'Om Sai Dairy Corner (FC Road)',
      eta: '12 mins',
      status: 'EN_ROUTE',
    },
    {
      id: 'del_102',
      routeCode: 'RT-B02',
      routeName: 'Kothrud & Karve Road Depot Run',
      driverName: 'Sunil Shinde',
      driverPhone: '+91 98223 88129',
      vehicleNo: 'MH-14-GH-9912',
      vehicleType: 'Mahindra Bolero Maxi Insulated',
      temperatureCelsius: 4.1,
      totalDrops: 10,
      completedDrops: 6,
      currentShop: 'Anand Supermarket (Mayur Colony)',
      eta: '25 mins',
      status: 'EN_ROUTE',
    },
    {
      id: 'del_103',
      routeCode: 'RT-C03',
      routeName: 'Hadapsar & Magarpatta City Run',
      driverName: 'Amit Patil',
      driverPhone: '+91 98229 11045',
      vehicleNo: 'MH-12-KQ-3104',
      vehicleType: 'Ashok Leyland Dost Cold-Box',
      temperatureCelsius: 3.9,
      totalDrops: 6,
      completedDrops: 6,
      currentShop: 'All Drops Finished (Returning to Hub)',
      eta: 'Delivered',
      status: 'COMPLETED',
    },
    {
      id: 'del_104',
      routeCode: 'RT-D04',
      routeName: 'Pimpri & Chinchwad Industrial Run',
      driverName: 'Ganesh Deshmukh',
      driverPhone: '+91 98220 77123',
      vehicleNo: 'MH-12-BT-1120',
      vehicleType: 'Tata Ace EV Insulated Box',
      temperatureCelsius: 5.2,
      totalDrops: 9,
      completedDrops: 4,
      currentShop: 'Mahesh Retail Store (Chinchwad Station)',
      eta: 'Delayed (+20 min)',
      status: 'DELAYED',
    },
  ];

  const filtered = deliveryRuns.filter((r) => {
    const matchSearch =
      r.routeName.toLowerCase().includes(search.toLowerCase()) ||
      r.driverName.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicleNo.toLowerCase().includes(search.toLowerCase()) ||
      r.routeCode.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Delivery Fleet Telematics & Routes</h2>
          <p className="page-desc">
            Monitor real-time morning milk dispatch runs, cold-chain temperature telemetry, and shop dropoff progress
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" icon={<RefreshCw size={14} />}>
            Refresh GPS Telemetry
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <Truck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active Vehicles on Road</span>
            <span className="metric-value">2 Vehicles</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>Morning Shift Run</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <ThermometerSnowflake size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Cold Chain Avg Temp</span>
            <span className="metric-value">4.2°C</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>Optimal Safe Range (&lt;5°C)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FAF6ED', color: '#C7A75A' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Completed Drops</span>
            <span className="metric-value">23 / 33 Drops</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>69.7% route progress</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Traffic Exception</span>
            <span className="metric-value">1 Delay Alert</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>Route D4 (Pimpri)</span>
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
              placeholder="Search by route, driver, vehicle plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search fleet deliveries"
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
              aria-label="Filter by delivery status"
            >
              <option value="">All Fleet Statuses</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="COMPLETED">Completed</option>
              <option value="DELAYED">Delayed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fleet Telematics Table */}
      <Card
        title="Live Dispatch Vehicles & Cold-Chain Telemetry"
        subtitle={`Tracking ${filtered.length} dispatch vehicles across Pune city sectors`}
        noPadding
      >
        <div className="business-table-container">
          <table className="business-table">
            <thead>
              <tr>
                <th>Route Code</th>
                <th>Route Territory</th>
                <th>Driver & Contact</th>
                <th>Reefer Vehicle</th>
                <th>Cold Temp</th>
                <th>Drop Progress</th>
                <th>Next Dropoff Shop</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const percent = Math.round((r.completedDrops / r.totalDrops) * 100);
                return (
                  <tr key={r.id}>
                    <td>
                      <code style={{ fontWeight: 700, fontSize: '12.5px' }}>{r.routeCode}</code>
                    </td>
                    <td>
                      <div className="font-semibold text-primary">{r.routeName}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#20342C' }}>{r.driverName}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} /> {r.driverPhone}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{r.vehicleNo}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>{r.vehicleType}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: r.temperatureCelsius > 5.0 ? '#B91C1C' : '#0369A1',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <ThermometerSnowflake size={13} />
                        {r.temperatureCelsius.toFixed(1)}°C
                      </span>
                    </td>
                    <td style={{ minWidth: '130px' }}>
                      <div style={{ fontSize: '12px', color: '#20342C', fontWeight: 600, marginBottom: '3px' }}>
                        {r.completedDrops} / {r.totalDrops} drops ({percent}%)
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            backgroundColor: r.status === 'COMPLETED' ? '#16805D' : r.status === 'DELAYED' ? '#B91C1C' : '#0369A1',
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', color: '#20342C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} className="text-emerald" />
                        <span>{r.currentShop}</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>ETA: {r.eta}</div>
                    </td>
                    <td>
                      <Badge
                        variant={
                          r.status === 'COMPLETED'
                            ? 'success'
                            : r.status === 'DELAYED'
                            ? 'danger'
                            : 'info'
                        }
                      >
                        {r.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
