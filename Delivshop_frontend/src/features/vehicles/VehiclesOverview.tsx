import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Eye,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle, VehicleSummary } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { AddVehicleModal } from './AddVehicleModal';
import { useNavigation } from '../../context/NavigationContext';

export const VehiclesOverview: React.FC = () => {
  const { navigate } = useNavigation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<VehicleSummary>({
    totalVehicles: 0,
    activeVehicles: 0,
    availableVehicles: 0,
    assignedVehicles: 0,
    underMaintenanceVehicles: 0,
    inactiveVehicles: 0,
    attentionRequired: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals / Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [listRes, summaryRes] = await Promise.all([
        api.vehicles.list({
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          vehicleType: typeFilter !== 'ALL' ? typeFilter : undefined,
        }),
        api.vehicles.getSummary(),
      ]);

      const rawList: any = listRes;
      const rawSummary: any = summaryRes;
      setVehicles(Array.isArray(rawList) ? rawList : rawList?.data || []);
      setSummary(rawSummary?.data || rawSummary || {});
    } catch (err: any) {
      setError(err?.message || 'Failed to load fleet vehicles');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchVehicles]);

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive || status === 'INACTIVE') {
      return <Badge variant="neutral">Inactive</Badge>;
    }
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success">Available</Badge>;
      case 'ASSIGNED':
        return <Badge variant="navy">Assigned</Badge>;
      case 'UNDER_MAINTENANCE':
        return <Badge variant="warning">Maintenance</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Fleet Vehicles Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
            Commercial distribution vans, tankers, temperature certifications, and maintenance schedules
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsAddModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Register Vehicle
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card className="summary-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Total Fleet
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {summary.totalVehicles || 0}
              </div>
            </div>
            <div style={{ background: '#F1F5F9', color: '#0F172A', padding: '10px', borderRadius: '8px' }}>
              <Truck size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '8px', fontWeight: 600 }}>
            {summary.activeVehicles || 0} Active Fleet Assets
          </div>
        </Card>

        <Card className="summary-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Available
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                {summary.availableVehicles || 0}
              </div>
            </div>
            <div style={{ background: '#DCFCE7', color: '#15803D', padding: '10px', borderRadius: '8px' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
            Ready for dispatch allocation
          </div>
        </Card>

        <Card className="summary-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                In Workshop
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                {summary.underMaintenanceVehicles || 0}
              </div>
            </div>
            <div style={{ background: '#FEF3C7', color: '#D97706', padding: '10px', borderRadius: '8px' }}>
              <Wrench size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
            Under inspection or repairs
          </div>
        </Card>

        <Card className="summary-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Attention Needed
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                {summary.attentionRequired || 0}
              </div>
            </div>
            <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px', borderRadius: '8px' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '8px', fontWeight: 600 }}>
            Expiring docs or inactive state
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94A3B8' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by registration number, vehicle ID, make/model, depot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: '#64748B' }} />
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Vehicle Type filter */}
          <div>
            <select
              className="form-control"
              style={{ width: '210px' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Vehicle Types</option>
              <option value="Refrigerated Van (1.5 Ton)">Refrigerated Van (1.5 Ton)</option>
              <option value="Insulated Delivery Van">Insulated Delivery Van</option>
              <option value="Electric Cargo Van">Electric Cargo Van</option>
              <option value="Refrigerated Milk Tanker">Refrigerated Milk Tanker</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={fetchVehicles}
            title="Refresh fleet table"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Vehicles Table */}
      {error && (
        <div className="form-error-banner" style={{ marginBottom: '16px' }}>
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>Vehicle Asset</th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>Type & Specs</th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>Depot & Location</th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>Capacity</th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                    <p>Loading fleet assets...</p>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
                    <Truck size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '15px' }}>No vehicles match filter criteria</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                      Try adjusting search terms or register a new vehicle asset.
                    </p>
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr
                    key={v.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/vehicles/${v.id}`)}
                        title="View Full Vehicle Details"
                      >
                        <div
                          style={{
                            background: v.is_refrigerated ? '#E0F2FE' : '#F1F5F9',
                            color: v.is_refrigerated ? '#0284C7' : '#475569',
                            padding: '8px',
                            borderRadius: '6px',
                          }}
                        >
                          <Truck size={18} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0369A1', display: 'block', textDecoration: 'underline', textDecorationColor: '#BAE6FD' }}>
                            {v.registration_number}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {v.vehicle_code} • {v.make_model}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div>
                        <span style={{ color: '#0F172A', fontWeight: 500 }}>{v.vehicle_type}</span>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Fuel: {v.fuel_type} {v.is_refrigerated && '• Chiller Installed'}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div>
                        <span style={{ color: '#0F172A' }}>{v.depot}</span>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{v.city ? `${v.city}, ${v.state}` : 'Central Fleet Depot'}</div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div>
                        <strong style={{ color: '#0F172A' }}>{v.capacity_crates} crates</strong>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{v.capacity_kg} KG payload</div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>{getStatusBadge(v.status, v.is_active)}</div>
                        {v.active_run_code && (
                          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>
                            {v.active_run_code}
                          </span>
                        )}
                        {(v.expiring_documents_count || 0) > 0 && (
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>
                            ⚠️ {v.expiring_documents_count} doc expiring/expired
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => navigate(`/admin/vehicles/${v.id}`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={13} /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVehicleCreated={() => {
          fetchVehicles();
        }}
      />
    </div>
  );
};
