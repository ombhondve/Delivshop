import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Boxes,
  X,
  Milk,
  Trash2,
  Truck,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import {
  Product,
  ProductSummaryStats,
  PaginatedResult,
  Company,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useNavigation } from '../../context/NavigationContext';

import { AddProductModal } from './AddProductModal';
import { EditProductModal } from './EditProductModal';
import { ProductDetailModal } from './ProductDetailModal';
import { ProductStatusDialog } from './ProductStatusDialog';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

const DAIRY_CATEGORIES = [
  'Milk',
  'Curd / Yogurt',
  'Buttermilk',
  'Paneer',
  'Butter',
  'Ghee',
  'Cheese',
  'Cream',
  'Flavoured Milk',
  'Other Dairy Products',
];

type StockTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export const ProductCatalog: React.FC = () => {
  const { navigate } = useNavigation();

  // Data states
  const [data, setData] = useState<PaginatedResult<Product>>({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [stats, setStats] = useState<ProductSummaryStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StockTab>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productForDeletion, setProductForDeletion] = useState<Product | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load companies for supplier filter
  useEffect(() => {
    api.companies
      .list({ limit: 100 })
      .then((res) => setCompanies(res.items || []))
      .catch((err) => console.warn('Could not load companies for filter:', err.message));
  }, []);

  // Fetch summary statistics
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.products.getStats();
      if (res) {
        setStats(res);
      }
    } catch (err: any) {
      console.warn('Failed to load product summary stats:', err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch products list
  const fetchProducts = useCallback(async () => {
    setTableLoading(true);
    setError(null);
    try {
      const res = await api.products.list({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        companyId: selectedCompanyId || undefined,
        category: selectedCategory || undefined,
        stockStatus: activeTab !== 'ALL' ? (activeTab as any) : undefined,
        sortBy: sortBy as any,
        sortOrder,
      });

      if (res) {
        setData(res);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch products';
      setError(msg);
    } finally {
      setTableLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedCompanyId, selectedCategory, activeTab, sortBy, sortOrder]);

  // Load data on query changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchProducts();
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCompanyId('');
    setSelectedCategory('');
    setActiveTab('ALL');
    setCurrentPage(1);
  };

  const isFilterActive =
    debouncedSearch.length > 0 ||
    selectedCompanyId !== '' ||
    selectedCategory !== '' ||
    activeTab !== 'ALL';

  const handleQuickStatusToggle = (prod: Product) => {
    setSelectedProduct(prod);
    setIsStatusDialogOpen(true);
  };

  const handleDeleteClick = (prod: Product) => {
    setProductForDeletion(prod);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="product-catalog-root">
      {/* 1. Header Toolbar */}
      <div className="catalog-header-card">
        <div className="catalog-header-inner">
          <div className="catalog-brand-lockup">
            <div className="catalog-brand-icon">
              <Package size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="catalog-title">Products</h1>
                <span className="catalog-subtitle-badge">Direct Supply Model</span>
              </div>
              <p className="catalog-description">
                Direct supplier-to-shop dairy product catalog, agreed supplier purchase costs, selling prices, and distributor allocations.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="live-status-dot" />
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRefreshAll}
              disabled={tableLoading || statsLoading}
              icon={<RefreshCw size={14} className={tableLoading || statsLoading ? 'spin-icon' : ''} />}
            >
              {tableLoading || statsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              icon={<Plus size={14} />}
            >
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Five Direct Supply Summary Metric Cards (Clickable to Filter) */}
      <div className="catalog-summary-cards-grid">
        {/* Card 1: Total Products */}
        <div
          onClick={() => {
            setActiveTab('ALL');
            setCurrentPage(1);
          }}
          className="catalog-summary-card"
          style={{
            border: `1px solid ${activeTab === 'ALL' ? 'var(--color-navy)' : '#D6D3C8'}`,
            boxShadow: activeTab === 'ALL' ? '0 2px 6px rgba(6, 78, 59, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Products
            </div>
            <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '1px', lineHeight: 1.2 }}>
              {statsLoading ? '...' : stats?.totalProducts ?? data.total}
            </div>
            <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>Catalogue items</div>
          </div>
          <div className="catalog-card-icon-box" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <Package size={15} />
          </div>
        </div>

        {/* Card 2: Active Products */}
        <div
          onClick={() => {
            setActiveTab('ACTIVE');
            setCurrentPage(1);
          }}
          className="catalog-summary-card"
          style={{
            border: `1px solid ${activeTab === 'ACTIVE' ? 'var(--color-primary)' : '#D6D3C8'}`,
            boxShadow: activeTab === 'ACTIVE' ? '0 2px 6px rgba(4, 120, 87, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Products
            </div>
            <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '1px', lineHeight: 1.2 }}>
              {statsLoading ? '...' : stats?.activeProducts ?? '—'}
            </div>
            <div style={{ fontSize: '9.5px', color: '#059669' }}>Orderable by shops</div>
          </div>
          <div className="catalog-card-icon-box" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <CheckCircle2 size={15} />
          </div>
        </div>

        {/* Card 3: Inactive Products */}
        <div
          onClick={() => {
            setActiveTab('INACTIVE');
            setCurrentPage(1);
          }}
          className="catalog-summary-card"
          style={{
            border: `1px solid ${activeTab === 'INACTIVE' ? '#D97706' : '#D6D3C8'}`,
            boxShadow: activeTab === 'INACTIVE' ? '0 2px 6px rgba(217, 119, 6, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inactive Products
            </div>
            <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: '#D97706', marginTop: '1px', lineHeight: 1.2 }}>
              {statsLoading ? '...' : stats?.inactiveProducts ?? (stats?.totalProducts ? stats.totalProducts - stats.activeProducts : 0)}
            </div>
            <div style={{ fontSize: '9.5px', color: '#B45309' }}>Unavailable for orders</div>
          </div>
          <div className="catalog-card-icon-box" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#D97706' }}>
            <XCircle size={15} />
          </div>
        </div>

        {/* Card 4: Supplier Companies Assigned */}
        <div
          onClick={() => navigate('companies')}
          className="catalog-summary-card"
          style={{
            border: '1px solid #D6D3C8',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Suppliers Linked
            </div>
            <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-navy)', marginTop: '1px', lineHeight: 1.2 }}>
              {statsLoading ? '...' : stats?.supplierAssignedProducts ?? companies.length}
            </div>
            <div style={{ fontSize: '9.5px', color: '#64748B' }}>Direct pickup points</div>
          </div>
          <div className="catalog-card-icon-box" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
            <Building2 size={15} />
          </div>
        </div>

        {/* Card 5: Dairy Categories */}
        <div
          className="catalog-summary-card"
          style={{
            border: '1px solid #D6D3C8',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Categories
            </div>
            <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '1px', lineHeight: 1.2 }}>
              {statsLoading ? '...' : stats?.categoriesCount ?? DAIRY_CATEGORIES.length}
            </div>
            <div style={{ fontSize: '9.5px', color: '#64748B' }}>Product lines</div>
          </div>
          <div className="catalog-card-icon-box" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <Boxes size={15} />
          </div>
        </div>
      </div>

      {/* 3. Segmented Tabs Filter */}
      <div className="catalog-tabs-bar">
        {(
          [
            { id: 'ALL', label: 'All Products' },
            { id: 'ACTIVE', label: 'Active Products' },
            { id: 'INACTIVE', label: 'Inactive Products' },
            { id: 'ARCHIVED', label: 'Archived / Deleted' },
          ] as { id: StockTab; label: string }[]
        ).map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className="catalog-tab-btn"
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                color: isSelected ? 'var(--color-navy)' : '#64748B',
                fontWeight: isSelected ? 700 : 500,
                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Search and Filter Toolbar */}
      <div className="catalog-filter-toolbar">
        {/* Search Input */}
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94A3B8' }} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product name, SKU, category, or supplier..."
            style={{
              width: '100%',
              height: '32px',
              padding: '0 10px 0 32px',
              borderRadius: '6px',
              border: '1px solid #A7AE9F',
              fontSize: '12.5px',
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
                right: '8px',
                top: '7px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {/* Supplier Company Filter */}
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #A7AE9F',
              fontSize: '12px',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Supplier Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.companyCode})
              </option>
            ))}
          </select>

          {/* Dairy Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #A7AE9F',
              fontSize: '12px',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Dairy Categories</option>
            {DAIRY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #A7AE9F',
              fontSize: '12px',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="created_at">Sort: Created Date</option>
            <option value="name">Sort: Product Name</option>
            <option value="sku">Sort: SKU Code</option>
            <option value="price">Sort: Selling Price</option>
          </select>

          {/* Sort Direction Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #A7AE9F',
              backgroundColor: '#FAFAF9',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title={sortOrder === 'ASC' ? 'Ascending (click for Descending)' : 'Descending (click for Ascending)'}
          >
            <ArrowUpDown size={13} />
            <span>{sortOrder === 'ASC' ? 'Asc' : 'Desc'}</span>
          </button>

          {/* Clear Filters */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                height: '32px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={13} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Products Table */}
      <div className="catalog-records-wrapper">
        <Card
          title="Dairy Product Catalogue"
          subtitle={`Displaying ${data.items.length} of ${data.total} products • Direct Supplier-to-Shop Distribution`}
          noPadding
          className="catalog-records-card"
        >
          {tableLoading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={28} className="spin-icon" style={{ margin: '0 auto 12px auto', color: 'var(--color-primary)' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                Retrieving live product catalogue from PostgreSQL...
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                Querying verified supplier company linkages and active product specifications
              </div>
            </div>
          ) : error ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#991B1B' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 12px auto', color: '#EF4444' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: '#991B1B' }}>
                Unable to load product catalogue
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px', margin: '0 auto 16px auto' }}>
                {error}
              </p>
              <Button variant="secondary" size="sm" onClick={fetchProducts}>
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
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <Package size={32} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', margin: '0 0 6px 0' }}>
                {isFilterActive ? 'No products match your criteria' : 'No dairy products in catalogue'}
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '0 auto 20px auto' }}>
                {isFilterActive
                  ? 'Try adjusting your search keyword, category, or clearing active filters.'
                  : 'Get started by creating your first dairy product linked to an authorized supplier company.'}
              </p>
              {isFilterActive ? (
                <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                  Clear All Filters
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setIsAddOpen(true)} icon={<Plus size={16} />}>
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="catalog-table-container">
              <table className="business-table catalog-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #D6D3C8', color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 12px', minWidth: '220px' }}>Product</th>
                    <th style={{ padding: '8px 10px', width: '120px' }}>SKU</th>
                    <th style={{ padding: '8px 10px', minWidth: '160px' }}>Supplier Company</th>
                    <th style={{ padding: '8px 10px' }}>Category & Pack</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Agreed Cost / Selling Price</th>
                    <th style={{ padding: '8px 10px', width: '110px' }}>Order Status</th>
                    <th style={{ padding: '8px 12px', width: '170px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((prod) => {
                    return (
                      <tr
                        key={prod.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Column 1: Product Name & Brand */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--color-primary-subtle)',
                                color: 'var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12px',
                                flexShrink: 0,
                                overflow: 'hidden',
                              }}
                            >
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Milk size={16} />
                              )}
                            </div>
                            <div>
                              <div
                                onClick={() => {
                                  setSelectedProduct(prod);
                                  setIsDetailOpen(true);
                                }}
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  lineHeight: 1.25,
                                }}
                                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-primary)')}
                                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-primary)')}
                              >
                                {prod.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2 }}>
                                {prod.brand || prod.category}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: SKU */}
                        <td style={{ padding: '8px 10px' }}>
                          <code
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              border: '1px solid #D6D3C8',
                            }}
                          >
                            {prod.sku}
                          </code>
                        </td>

                        {/* Column 3: Supplier Company */}
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Building2 size={13} color="var(--color-primary)" />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                              {prod.company?.name || 'Assigned Supplier'}
                            </span>
                          </div>
                          {prod.company?.code && (
                            <span style={{ fontSize: '10.5px', color: '#94A3B8', fontFamily: 'monospace' }}>
                              {prod.company.code}
                            </span>
                          )}
                        </td>

                        {/* Column 4: Category & Pack */}
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontSize: '12px', color: '#1F2937', fontWeight: 500 }}>
                            {prod.category}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {prod.packSize} • {prod.baseUnit}
                          </div>
                        </td>

                        {/* Column 5: Agreed Cost / Selling Price */}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy)' }}>
                            ₹{Number(prod.price).toFixed(2)}{' '}
                            <span style={{ fontSize: '10px', fontWeight: 500, color: '#64748B' }}>sell</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Cost: ₹{Number(prod.purchaseCost || 0).toFixed(2)}
                          </div>
                        </td>

                        {/* Column 6: Orderability Status */}
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: prod.isActive ? '#DCFCE7' : '#F1F5F9',
                              color: prod.isActive ? '#166534' : '#64748B',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: prod.isActive ? '#16A34A' : '#94A3B8',
                              }}
                            />
                            {prod.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Column 7: Actions */}
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsDetailOpen(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                border: '1px solid #A7AE9F',
                                backgroundColor: '#FFFFFF',
                                color: '#334155',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                height: '28px',
                              }}
                              title="View Product Specifications"
                            >
                              <Eye size={12} />
                              <span>Details</span>
                            </button>

                            {/* Edit Product */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsEditOpen(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                border: '1px solid #A7AE9F',
                                backgroundColor: '#FFFFFF',
                                color: '#475569',
                                cursor: 'pointer',
                                height: '28px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Edit Product"
                            >
                              <Pencil size={13} />
                            </button>

                            {/* Status Toggle (Deactivate / Reactivate) */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsStatusDialogOpen(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                border: '1px solid',
                                borderColor: prod.isActive ? '#FDE68A' : '#BBF7D0',
                                backgroundColor: prod.isActive ? '#FFFBEB' : '#F0FDF4',
                                color: prod.isActive ? '#D97706' : '#059669',
                                cursor: 'pointer',
                                height: '28px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={prod.isActive ? 'Deactivate Product' : 'Reactivate Product'}
                              aria-label={prod.isActive ? 'Deactivate Product' : 'Reactivate Product'}
                            >
                              <Power size={13} />
                            </button>

                            {/* Delete Product */}
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(prod)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                cursor: 'pointer',
                                height: '28px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete Product"
                              aria-label={`Delete product ${prod.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table Pagination Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontSize: '12.5px',
                  color: '#64748B',
                }}
              >
                <div>
                  Showing {data.items.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                  {Math.min(currentPage * pageSize, data.total)} of {data.total} products
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: currentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
                        color: currentPage <= 1 ? '#94A3B8' : '#334155',
                        cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ padding: '4px 8px', fontWeight: 600 }}>
                      Page {currentPage} of {data.totalPages || 1}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= (data.totalPages || 1)}
                      onClick={() => setCurrentPage((p) => Math.min(data.totalPages || 1, p + 1))}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: currentPage >= (data.totalPages || 1) ? '#F1F5F9' : '#FFFFFF',
                        color: currentPage >= (data.totalPages || 1) ? '#94A3B8' : '#334155',
                        cursor: currentPage >= (data.totalPages || 1) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onProductCreated={() => {
          fetchStats();
          fetchProducts();
        }}
      />

      <EditProductModal
        product={selectedProduct}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedProduct(null);
        }}
        onProductUpdated={() => {
          fetchStats();
          fetchProducts();
        }}
      />

      <ProductDetailModal
        productId={selectedProduct?.id || null}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProduct(null);
        }}
        onEdit={(prod) => {
          setIsDetailOpen(false);
          setSelectedProduct(prod);
          setIsEditOpen(true);
        }}
        onToggleStatus={(prod) => {
          handleQuickStatusToggle(prod);
          setIsDetailOpen(false);
        }}
      />

      {/* Product Deactivation / Reactivation Confirmation Dialog */}
      <ProductStatusDialog
        product={selectedProduct}
        isOpen={isStatusDialogOpen}
        onClose={() => {
          setIsStatusDialogOpen(false);
          setSelectedProduct(null);
        }}
        onStatusChanged={() => {
          fetchStats();
          fetchProducts();
        }}
      />

      {/* Deactivation-First Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setProductForDeletion(null);
        }}
        title="Delete Product"
        entityType="Product"
        entityName={productForDeletion?.name || ''}
        entityIdentifier={productForDeletion?.sku}
        isActive={Boolean(productForDeletion?.isActive)}
        onDeactivateRequested={() => {
          if (productForDeletion) {
            setSelectedProduct(productForDeletion);
            setIsStatusDialogOpen(true);
          }
        }}
        onConfirm={async (reason) => {
          if (productForDeletion) {
            await api.products.delete(productForDeletion.id, reason);
            handleRefreshAll();
          }
        }}
      />
    </div>
  );
};
