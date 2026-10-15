import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  MapPin,
  Phone,
  Mail,
  User,
  X,
  FileText,
  Clock,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Company, CompanySummaryStats, PaginatedResult } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useNavigation } from '../../context/NavigationContext';
import { AddCompanyModal } from './AddCompanyModal';
import { EditCompanyModal } from './EditCompanyModal';
import { CompanyDetailModal } from './CompanyDetailModal';
import { CompanyStatusDialog } from './CompanyStatusDialog';

export const CompanyOverview: React.FC = () => {
  const { companyId, navigate } = useNavigation();

  // Data states
  const [data, setData] = useState<PaginatedResult<Company>>({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [stats, setStats] = useState<CompanySummaryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState<Company | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Company | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedForStatus, setSelectedForStatus] = useState<Company | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Copy GSTIN state
  const [copiedGstin, setCopiedGstin] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch summary statistics
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.companies.getStats();
      if (res) {
        setStats(res);
      }
    } catch (err: any) {
      console.warn('Failed to load company summary stats:', err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch company records
  const fetchCompanies = useCallback(async () => {
    setTableLoading(true);
    setError(null);
    try {
      const res = await api.companies.list({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        companyType: typeFilter || undefined,
        sortBy,
        sortOrder,
      });

      setData(res);
      setLastRefreshed(new Date());
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to connect to backend service';
      setError(msg);
    } finally {
      setTableLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, typeFilter, sortBy, sortOrder]);

  // Initial load and dependencies
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Handle route deep linking /companies/:companyId
  useEffect(() => {
    if (companyId) {
      // Find in existing items or fetch directly
      const found = data.items.find((c) => c.id === companyId || c.companyCode === companyId);
      if (found) {
        setSelectedForDetails(found);
        setIsDetailsOpen(true);
      } else {
        api.companies.get(companyId)
          .then((comp) => {
            if (comp) {
              setSelectedForDetails(comp);
              setIsDetailsOpen(true);
            }
          })
          .catch((err) => {
            console.warn('Could not load company for deep link:', err.message);
          });
      }
    }
  }, [companyId, data.items]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchCompanies();
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setSortBy('createdAt');
    setSortOrder('DESC');
    setCurrentPage(1);
  };

  const handleCopyGstin = (e: React.MouseEvent, gstin: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(gstin);
    setCopiedGstin(gstin);
    setTimeout(() => setCopiedGstin(null), 2000);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const formatCompanyType = (type?: string) => {
    switch (type) {
      case 'DAIRY_PRODUCER':
        return 'Dairy Producer';
      case 'DISTRIBUTOR':
        return 'Distributor';
      case 'PROCESSOR':
        return 'Dairy Processor';
      case 'LOGISTICS_PARTNER':
        return 'Logistics Partner';
      case 'OTHER':
        return 'Other Supplier';
      default:
        return type || 'Dairy Supplier';
    }
  };

  const isFilterActive = Boolean(searchInput || statusFilter || typeFilter || sortBy !== 'createdAt' || sortOrder !== 'DESC');

  return (
    <div className="page-container" style={{ paddingBottom: '40px' }}>
      {/* 1. Page Header & Breadcrumbs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer', color: '#168264' }} onClick={() => navigate('/')}>
            Dashboard
          </span>
          <span>/</span>
          <span style={{ color: '#1F2937', fontWeight: 600 }}>Company Management</span>
        </div>

        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 800, color: '#123D32', margin: 0 }}>
              Company Management
            </h1>
            <p className="page-desc" style={{ marginTop: '4px', color: '#64748B', fontSize: '14px' }}>
              Manage registered dairy producers, processing hubs, supplier details, and corporate information
            </p>
          </div>

          <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginRight: '6px',
              }}
              title={lastRefreshed.toLocaleTimeString()}
            >
              <Clock size={13} />
              Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            <Button
              type="button"
              variant="secondary"
              onClick={handleRefreshAll}
              disabled={tableLoading || statsLoading}
              icon={<RefreshCw size={15} className={tableLoading || statsLoading ? 'spin-icon' : ''} />}
            >
              {tableLoading || statsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => setIsAddOpen(true)}
              icon={<Plus size={16} />}
            >
              Add Company
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Summary Metric Cards (Section 4.B) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Companies */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Companies
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#123D32', marginTop: '4px' }}>
              {statsLoading ? '...' : stats?.totalCompanies ?? data.total}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
              Registered suppliers & hubs
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(18, 61, 50, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#123D32',
            }}
          >
            <Building2 size={22} />
          </div>
        </div>

        {/* Card 2: Active Companies */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Companies
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#168264', marginTop: '4px' }}>
              {statsLoading ? '...' : stats?.activeCompanies ?? '—'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '2px' }}>
              Ready for supply dispatch
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(22, 130, 100, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#168264',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Card 3: Inactive Companies */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inactive Companies
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
              {statsLoading ? '...' : stats?.inactiveCompanies ?? '—'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#B45309', marginTop: '2px' }}>
              Temporarily paused / review
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Card 4: Recently Added */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recently Added
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
              {statsLoading ? '...' : stats?.recentCompanies ?? '—'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#1E40AF', marginTop: '2px' }}>
              Enrolled in last 30 days
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}
          >
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar (Section 4.C) */}
      <div
        className="search-filter-toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Search Input */}
        <div style={{ flex: '1 1 320px', position: 'relative' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94A3B8' }} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by company name, code, contact person, phone, email, or city..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13.5px',
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: '#FAFAF9',
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '11px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '2px',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13.5px',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Company Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13.5px',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Company Types</option>
            <option value="DAIRY_PRODUCER">Dairy Producer</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="PROCESSOR">Dairy Processor</option>
            <option value="LOGISTICS_PARTNER">Logistics Partner</option>
            <option value="OTHER">Other Supplier</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13.5px',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="name">Sort: Company Name</option>
            <option value="companyCode">Sort: Company Code</option>
            <option value="city">Sort: City</option>
          </select>

          {/* Sort Direction Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title={sortOrder === 'ASC' ? 'Ascending (click for Descending)' : 'Descending (click for Ascending)'}
          >
            <ArrowUpDown size={14} />
            <span>{sortOrder === 'ASC' ? 'Asc' : 'Desc'}</span>
          </button>

          {/* Clear Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Company Table & States (Section 4.D & 4.E) */}
      <Card
        title="Registered Dairy Companies"
        subtitle={`Displaying ${data.items.length} of ${data.total} companies`}
        noPadding
      >
        {tableLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="spin-icon" style={{ margin: '0 auto 12px auto', color: '#168264' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
              Retrieving companies from database...
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
              Connecting to secure PostgreSQL repository
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#991B1B' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 12px auto', color: '#EF4444' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: '#991B1B' }}>
              Unable to load company data
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px', margin: '0 auto 16px auto' }}>
              {error}
            </p>
            <Button variant="secondary" size="sm" onClick={fetchCompanies}>
              Retry Connection
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: 'rgba(18, 61, 50, 0.08)',
                color: '#123D32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Building2 size={32} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', margin: '0 0 6px 0' }}>
              {isFilterActive ? 'No companies match your filters' : 'No companies registered yet'}
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '0 auto 20px auto' }}>
              {isFilterActive
                ? 'Try refining your search keyword, resetting the status dropdown, or clearing all filters.'
                : 'Get started by creating your first dairy company or supplier profile to begin dispatching inventory.'}
            </p>
            {isFilterActive ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => setIsAddOpen(true)}
                icon={<Plus size={16} />}
              >
                Add First Company
              </Button>
            )}
          </div>
        ) : (
          <div className="business-table-container" style={{ overflowX: 'auto' }}>
            <table className="business-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px', minWidth: '220px' }}>Company</th>
                  <th style={{ padding: '12px 14px', width: '130px' }}>Code</th>
                  <th style={{ padding: '12px 14px' }}>Contact Person</th>
                  <th style={{ padding: '12px 14px' }}>Phone & Email</th>
                  <th style={{ padding: '12px 14px' }}>City</th>
                  <th style={{ padding: '12px 14px' }}>GSTIN</th>
                  <th style={{ padding: '12px 14px', width: '100px' }}>Status</th>
                  <th style={{ padding: '12px 14px', width: '110px' }}>Created</th>
                  <th style={{ padding: '12px 16px', width: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((company) => {
                  const isActive = company.status === 'ACTIVE';

                  return (
                    <tr
                      key={company.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Column 1: Company Name & Type */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: isActive ? 'rgba(18, 61, 50, 0.08)' : 'rgba(217, 119, 6, 0.1)',
                              color: isActive ? '#123D32' : '#D97706',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '14px',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {company.logoUrl ? (
                              <img
                                src={company.logoUrl}
                                alt={company.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  // Fallback to initial if image fails
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              company.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div
                              onClick={() => {
                                setSelectedForDetails(company);
                                setIsDetailsOpen(true);
                              }}
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#123D32',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#168264')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#123D32')}
                            >
                              {company.name}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                              {formatCompanyType(company.companyType)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Company Code */}
                      <td style={{ padding: '12px 14px' }}>
                        <code
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 7px',
                            borderRadius: '5px',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {company.companyCode}
                        </code>
                      </td>

                      {/* Column 3: Contact Person */}
                      <td style={{ padding: '12px 14px' }}>
                        {company.contactPerson ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1F2937', fontWeight: 500 }}>
                            <User size={13} color="#94A3B8" />
                            <span>{company.contactPerson}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '13px' }}>—</span>
                        )}
                      </td>

                      {/* Column 4: Phone & Email */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                          {company.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                              <Phone size={12} color="#168264" />
                              <span>{company.phone}</span>
                            </div>
                          ) : null}
                          {company.email ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                              <Mail size={12} color="#94A3B8" />
                              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {company.email}
                              </span>
                            </div>
                          ) : null}
                          {!company.phone && !company.email && <span style={{ color: '#94A3B8' }}>—</span>}
                        </div>
                      </td>

                      {/* Column 5: City */}
                      <td style={{ padding: '12px 14px' }}>
                        {company.city ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#334155' }}>
                            <MapPin size={13} color="#168264" />
                            <span>{company.city}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '13px' }}>—</span>
                        )}
                      </td>

                      {/* Column 6: GSTIN */}
                      <td style={{ padding: '12px 14px' }}>
                        {company.gstin ? (
                          <button
                            type="button"
                            onClick={(e) => handleCopyGstin(e, company.gstin!)}
                            title="Click to copy GSTIN"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                          >
                            <span>{company.gstin}</span>
                            {copiedGstin === company.gstin ? (
                              <Check size={11} color="#168264" />
                            ) : (
                              <Copy size={11} color="#94A3B8" />
                            )}
                          </button>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '13px' }}>—</span>
                        )}
                      </td>

                      {/* Column 7: Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            backgroundColor: isActive ? '#DCFCE7' : '#FEF3C7',
                            color: isActive ? '#166534' : '#92400E',
                            border: `1px solid ${isActive ? '#BBF7D0' : '#FDE68A'}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isActive ? '#16A34A' : '#D97706',
                            }}
                          />
                          {company.status}
                        </span>
                      </td>

                      {/* Column 8: Created Date */}
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {formatDate(company.createdAt)}
                      </td>

                      {/* Column 9: Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForDetails(company);
                              setIsDetailsOpen(true);
                            }}
                            className="btn btn-secondary btn-table-action"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="View Complete Profile"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>

                          {/* Edit Company */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForEdit(company);
                              setIsEditOpen(true);
                            }}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Edit Company"
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForStatus(company);
                              setIsStatusOpen(true);
                            }}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: isActive ? '#FDE68A' : '#BBF7D0',
                              backgroundColor: isActive ? '#FFFBEB' : '#F0FDF4',
                              color: isActive ? '#D97706' : '#168264',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={isActive ? 'Deactivate Company' : 'Activate Company'}
                          >
                            <Power size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {data.total > 0 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: '#FAFAF9',
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Showing{' '}
              <strong>
                {Math.min((currentPage - 1) * pageSize + 1, data.total)}
              </strong>{' '}
              to{' '}
              <strong>
                {Math.min(currentPage * pageSize, data.total)}
              </strong>{' '}
              of <strong>{data.total}</strong> companies
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Page size selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#64748B' }}>
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || tableLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: currentPage <= 1 ? '#94A3B8' : '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600, padding: '0 6px' }}>
                  {data.page} / {Math.max(1, data.totalPages)}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={currentPage >= data.totalPages || tableLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: currentPage >= data.totalPages ? '#94A3B8' : '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: currentPage >= data.totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 6. Modals */}
      <AddCompanyModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCompanyCreated={() => {
          fetchStats();
          fetchCompanies();
        }}
      />

      <EditCompanyModal
        company={selectedForEdit}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedForEdit(null);
        }}
        onCompanyUpdated={() => {
          fetchStats();
          fetchCompanies();
        }}
      />

      <CompanyDetailModal
        company={selectedForDetails}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedForDetails(null);
          // If we were on /companies/:companyId, replace state
          if (companyId) {
            navigate('/companies');
          }
        }}
        onEdit={(company: Company) => {
          setSelectedForDetails(null);
          setIsDetailsOpen(false);
          setSelectedForEdit(company);
          setIsEditOpen(true);
        }}
        onToggleStatus={(company: Company) => {
          setSelectedForDetails(null);
          setIsDetailsOpen(false);
          setSelectedForStatus(company);
          setIsStatusOpen(true);
        }}
      />

      <CompanyStatusDialog
        company={selectedForStatus}
        isOpen={isStatusOpen}
        onClose={() => {
          setIsStatusOpen(false);
          setSelectedForStatus(null);
        }}
        onStatusChanged={() => {
          fetchStats();
          fetchCompanies();
        }}
      />
    </div>
  );
};
