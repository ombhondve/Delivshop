import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Power,
  Sliders,
  History,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Boxes,
  PlusCircle,
  X,
  PackagePlus,
  Milk,
  Trash2,
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
import { StockReceiptModal } from './StockReceiptModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { InventoryLedgerModal } from './InventoryLedgerModal';
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

type StockTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_SOON';

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
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
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
        stockStatus: activeTab !== 'ALL' ? activeTab : undefined,
        sortBy: sortBy as any,
        sortOrder,
      });

      setData(res);
      setLastRefreshed(new Date());
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to connect to backend product catalog';
      setError(msg);
    } finally {
      setTableLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedCompanyId, selectedCategory, activeTab, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchProducts();
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setActiveTab('ALL');
    setSelectedCompanyId('');
    setSelectedCategory('');
    setSortBy('created_at');
    setSortOrder('DESC');
    setCurrentPage(1);
  };

  const handleQuickStatusToggle = async (product: Product) => {
    const nextStatus = !product.isActive;
    try {
      await api.products.updateStatus(product.id, nextStatus);
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update product status');
    }
  };

  const isFilterActive = Boolean(
    searchInput ||
      selectedCompanyId ||
      selectedCategory ||
      activeTab !== 'ALL' ||
      sortBy !== 'created_at' ||
      sortOrder !== 'DESC'
  );

  return (
    <>
      <div className="catalog-page-container">
        {/* Pinned Non-Scrolling Page Toolbar Area */}
        <div className="catalog-toolbar-pinned">
          {/* 1. Page Header & Breadcrumbs */}
          <div className="catalog-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
              <span style={{ cursor: 'pointer', color: '#168264', fontWeight: 500 }} onClick={() => navigate('/')}>
                Dashboard
              </span>
              <span>/</span>
              <span style={{ color: '#1F2937', fontWeight: 600 }}>Products & Inventory</span>
            </div>

            <div className="catalog-header-title-row">
              <div>
                <h1 className="page-title" style={{ fontSize: '22px', fontWeight: 800, color: '#123D32', margin: 0 }}>
                  Products & Inventory
                </h1>
                <p className="page-desc" style={{ marginTop: '2px', color: '#64748B', fontSize: '13px' }}>
                  Manage dairy products, supplier companies, pricing, stock and expiry information
                </p>
              </div>

              <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginRight: '4px',
                  }}
                >
                  <Clock size={13} />
                  Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setIsLedgerOpen(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '30px',
                  }}
                >
                  <History size={13} />
                  Stock Ledger
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(data.items[0] || null);
                    setIsAdjustmentOpen(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '30px',
                  }}
                >
                  <Sliders size={13} />
                  Stock Adjustment
                </button>

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

          {/* 2. Five Summary Metric Cards (Clickable to Filter) */}
          <div className="catalog-summary-cards-grid">
            {/* Card 1: Total Products */}
            <div
              onClick={() => {
                setActiveTab('ALL');
                setCurrentPage(1);
              }}
              className="catalog-summary-card"
              style={{
                border: `1px solid ${activeTab === 'ALL' ? '#123D32' : '#E2E8F0'}`,
                boxShadow: activeTab === 'ALL' ? '0 2px 6px rgba(18, 61, 50, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Products
                </div>
                <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: '#123D32', marginTop: '1px', lineHeight: 1.2 }}>
                  {statsLoading ? '...' : stats?.totalProducts ?? data.total}
                </div>
                <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>Catalogue items</div>
              </div>
              <div className="catalog-card-icon-box" style={{ backgroundColor: 'rgba(18, 61, 50, 0.08)', color: '#123D32' }}>
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
                border: `1px solid ${activeTab === 'ACTIVE' ? '#168264' : '#E2E8F0'}`,
                boxShadow: activeTab === 'ACTIVE' ? '0 2px 6px rgba(22, 130, 100, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Products
                </div>
                <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: '#168264', marginTop: '1px', lineHeight: 1.2 }}>
                  {statsLoading ? '...' : stats?.activeProducts ?? '—'}
                </div>
                <div style={{ fontSize: '9.5px', color: '#166534' }}>Ready for dispatch</div>
              </div>
              <div className="catalog-card-icon-box" style={{ backgroundColor: 'rgba(22, 130, 100, 0.1)', color: '#168264' }}>
                <CheckCircle2 size={15} />
              </div>
            </div>

            {/* Card 3: Low Stock Items */}
            <div
              onClick={() => {
                setActiveTab('LOW_STOCK');
                setCurrentPage(1);
              }}
              className="catalog-summary-card"
              style={{
                border: `1px solid ${activeTab === 'LOW_STOCK' ? '#D97706' : '#E2E8F0'}`,
                boxShadow: activeTab === 'LOW_STOCK' ? '0 2px 6px rgba(217, 119, 6, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Low Stock Items
                </div>
                <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: '#D97706', marginTop: '1px', lineHeight: 1.2 }}>
                  {statsLoading ? '...' : stats?.lowStockItems ?? '—'}
                </div>
                <div style={{ fontSize: '9.5px', color: '#B45309' }}>Below threshold</div>
              </div>
              <div className="catalog-card-icon-box" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#D97706' }}>
                <AlertTriangle size={15} />
              </div>
            </div>

            {/* Card 4: Out-of-Stock */}
            <div
              onClick={() => {
                setActiveTab('OUT_OF_STOCK');
                setCurrentPage(1);
              }}
              className="catalog-summary-card"
              style={{
                border: `1px solid ${activeTab === 'OUT_OF_STOCK' ? '#EF4444' : '#E2E8F0'}`,
                boxShadow: activeTab === 'OUT_OF_STOCK' ? '0 2px 6px rgba(239, 68, 68, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Out of Stock
                </div>
                <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626', marginTop: '1px', lineHeight: 1.2 }}>
                  {statsLoading ? '...' : stats?.outOfStockItems ?? '—'}
                </div>
                <div style={{ fontSize: '9.5px', color: '#991B1B' }}>Zero inventory</div>
              </div>
              <div className="catalog-card-icon-box" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#DC2626' }}>
                <XCircle size={15} />
              </div>
            </div>

            {/* Card 5: Expiring Soon */}
            <div
              onClick={() => {
                setActiveTab('EXPIRING_SOON');
                setCurrentPage(1);
              }}
              className="catalog-summary-card"
              style={{
                border: `1px solid ${activeTab === 'EXPIRING_SOON' ? '#2563EB' : '#E2E8F0'}`,
                boxShadow: activeTab === 'EXPIRING_SOON' ? '0 2px 6px rgba(37, 99, 235, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Expiring Soon
                </div>
                <div className="card-metric-val" style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB', marginTop: '1px', lineHeight: 1.2 }}>
                  {statsLoading ? '...' : stats?.expiringSoonItems ?? '—'}
                </div>
                <div style={{ fontSize: '9.5px', color: '#1E40AF' }}>Next 7 days</div>
              </div>
              <div className="catalog-card-icon-box" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
                <Clock size={15} />
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
            { id: 'LOW_STOCK', label: 'Low Stock' },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
            { id: 'EXPIRING_SOON', label: 'Expiring Soon (< 7 Days)' },
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
                color: isSelected ? '#123D32' : '#64748B',
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
              border: '1px solid #CBD5E1',
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
              border: '1px solid #CBD5E1',
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
              border: '1px solid #CBD5E1',
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
              border: '1px solid #CBD5E1',
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
            <option value="stock_quantity">Sort: Available Stock</option>
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
              border: '1px solid #CBD5E1',
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
    </div>

    {/* 5. Products Table */}
    <div className="catalog-records-wrapper">
      <Card
        title="Dairy Product Catalogue & Stock Balances"
        subtitle={`Displaying ${data.items.length} of ${data.total} products`}
        noPadding
        className="catalog-records-card"
      >
        {tableLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="spin-icon" style={{ margin: '0 auto 12px auto', color: '#168264' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
              Retrieving live products & stock from PostgreSQL...
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
              Querying verified inventory balances and supplier linkages
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
                backgroundColor: 'rgba(18, 61, 50, 0.08)',
                color: '#123D32',
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
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '7px 10px', minWidth: '200px' }}>Product</th>
                  <th style={{ padding: '7px 8px', width: '120px' }}>SKU</th>
                  <th style={{ padding: '7px 8px', minWidth: '150px' }}>Supplier Company</th>
                  <th style={{ padding: '7px 8px' }}>Category & Pack</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right' }}>Cost / Price</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right' }}>Available Stock</th>
                  <th style={{ padding: '7px 8px' }}>Expiry / Lot</th>
                  <th style={{ padding: '7px 8px', width: '85px' }}>Status</th>
                  <th style={{ padding: '7px 10px', width: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((prod) => {
                  const stock = prod.stockQuantity ?? 0;
                  const isOut = stock === 0;
                  const isLow = !isOut && stock <= (prod.minStockThreshold ?? 10);

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
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(18, 61, 50, 0.08)',
                              color: '#123D32',
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
                              <Milk size={15} />
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
                                color: '#123D32',
                                cursor: 'pointer',
                                lineHeight: 1.25,
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#168264')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#123D32')}
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
                      <td style={{ padding: '6px 8px' }}>
                        <code
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: '4px',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {prod.sku}
                        </code>
                      </td>

                      {/* Column 3: Supplier Company */}
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={12} color="#168264" />
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
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontSize: '12px', color: '#1F2937', fontWeight: 500 }}>
                          {prod.category}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {prod.packSize}
                        </div>
                      </td>

                      {/* Column 5: Cost / Selling Price */}
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#168264' }}>
                          ₹{Number(prod.price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                          Cost: ₹{Number(prod.purchaseCost || 0).toFixed(2)}
                        </div>
                      </td>

                      {/* Column 6: Available Stock */}
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 800,
                            color: isOut ? '#DC2626' : isLow ? '#D97706' : '#123D32',
                            lineHeight: 1.2,
                          }}
                        >
                          {stock.toLocaleString()}{' '}
                          <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>
                            {prod.baseUnit}s
                          </span>
                        </div>
                        <div>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#DCFCE7',
                              color: isOut ? '#991B1B' : isLow ? '#92400E' : '#166534',
                            }}
                          >
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </div>
                      </td>

                      {/* Column 7: Expiry / Lot */}
                      <td style={{ padding: '6px 8px' }}>
                        {prod.nearestExpiry ? (
                          <div style={{ fontSize: '11.5px' }}>
                            <div style={{ color: '#334155', fontWeight: 500 }}>
                              {new Date(prod.nearestExpiry).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: prod.isExpiringSoon ? '#D97706' : '#168264',
                              }}
                            >
                              <Clock size={10} />
                              {prod.isExpiringSoon ? 'Expiring soon' : 'Fresh stock'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '11.5px' }}>—</span>
                        )}
                      </td>

                      {/* Column 8: Status */}
                      <td style={{ padding: '6px 8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
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

                      {/* Column 9: Actions */}
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setIsDetailOpen(true);
                            }}
                            style={{
                              padding: '4px 7px',
                              borderRadius: '5px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              height: '26px',
                            }}
                            title="View Product Details"
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>

                          {/* Quick Receive Stock */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setIsReceiptOpen(true);
                            }}
                            style={{
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid #BBF7D0',
                              backgroundColor: '#F0FDF4',
                              color: '#168264',
                              cursor: 'pointer',
                              width: '26px',
                              height: '26px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Receive Inward Stock"
                          >
                            <PackagePlus size={13} />
                          </button>

                          {/* Quick Adjust Stock */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setIsAdjustmentOpen(true);
                            }}
                            style={{
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid #FDE68A',
                              backgroundColor: '#FFFBEB',
                              color: '#D97706',
                              cursor: 'pointer',
                              width: '26px',
                              height: '26px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Adjust Stock Balance"
                          >
                            <Sliders size={13} />
                          </button>

                          {/* Edit Product */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setIsEditOpen(true);
                            }}
                            style={{
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              cursor: 'pointer',
                              width: '26px',
                              height: '26px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Edit Product"
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Status Toggle (Deactivate / Reactivate) */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setIsStatusDialogOpen(true);
                            }}
                            style={{
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid',
                              borderColor: prod.isActive ? '#FDE68A' : '#BBF7D0',
                              backgroundColor: prod.isActive ? '#FFFBEB' : '#F0FDF4',
                              color: prod.isActive ? '#D97706' : '#168264',
                              cursor: 'pointer',
                              width: '26px',
                              height: '26px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={prod.isActive ? 'Deactivate Product' : 'Reactivate Product'}
                            aria-label={prod.isActive ? 'Deactivate Product' : 'Reactivate Product'}
                          >
                            <Power size={12} />
                          </button>

                          {/* Delete Action (Strict Rule 1 & Rule 2 Enforcement) */}
                          {prod.isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsStatusDialogOpen(true);
                              }}
                              style={{
                                padding: '4px',
                                borderRadius: '5px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#F8FAFC',
                                color: '#94A3B8',
                                cursor: 'not-allowed',
                                opacity: 0.6,
                                width: '26px',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Deactivate this product before deleting it."
                              aria-label="Deactivate this product before deleting it"
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setProductForDeletion(prod);
                                setIsDeleteDialogOpen(true);
                              }}
                              style={{
                                padding: '4px',
                                borderRadius: '5px',
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                width: '26px',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete Inactive Product"
                              aria-label="Delete Inactive Product"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Pagination Footer */}
        {data.total > 0 && (
          <div className="catalog-pagination-footer">
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Showing{' '}
              <strong>{Math.min((currentPage - 1) * pageSize + 1, data.total)}</strong> to{' '}
              <strong>{Math.min(currentPage * pageSize, data.total)}</strong> of{' '}
              <strong>{data.total}</strong> products
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
    </div>
  </div>

      {/* 7. Modals */}
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
        onReceiveStock={(prod) => {
          setIsDetailOpen(false);
          setSelectedProduct(prod);
          setIsReceiptOpen(true);
        }}
        onAdjustStock={(prod) => {
          setIsDetailOpen(false);
          setSelectedProduct(prod);
          setIsAdjustmentOpen(true);
        }}
        onViewLedger={(prod) => {
          setIsDetailOpen(false);
          setSelectedProduct(prod);
          setIsLedgerOpen(true);
        }}
        onToggleStatus={(prod) => {
          handleQuickStatusToggle(prod);
          setIsDetailOpen(false);
        }}
      />

      <StockReceiptModal
        product={selectedProduct}
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedProduct(null);
        }}
        onStockReceived={() => {
          fetchStats();
          fetchProducts();
        }}
      />

      <StockAdjustmentModal
        product={selectedProduct}
        isOpen={isAdjustmentOpen}
        onClose={() => {
          setIsAdjustmentOpen(false);
          setSelectedProduct(null);
        }}
        onStockAdjusted={() => {
          fetchStats();
          fetchProducts();
        }}
      />

      <InventoryLedgerModal
        product={selectedProduct}
        isOpen={isLedgerOpen}
        onClose={() => {
          setIsLedgerOpen(false);
          setSelectedProduct(null);
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
        customWarning={
          productForDeletion && (productForDeletion.stockQuantity ?? 0) > 0
            ? `Cannot permanently delete this product because it currently has ${productForDeletion.stockQuantity} ${productForDeletion.baseUnit || 'unit'}s in stock. The system requires inventory to be adjusted to 0 before physical removal.`
            : undefined
        }
        onConfirm={async (reason) => {
          if (productForDeletion) {
            await api.products.delete(productForDeletion.id, reason);
            handleRefreshAll();
          }
        }}
      />
    </>
  );
};
