import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ListFilter,
  RefreshCw,
  Eye,
  Pencil,
  Power,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Building2,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Shop, PaginatedResult } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { AddShopModal } from './AddShopModal';
import { ShopDetailModal } from './ShopDetailModal';
import { EditShopModal } from './EditShopModal';

export const ShopOverview: React.FC = () => {
  const [data, setData] = useState<PaginatedResult<Shop>>({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [shopType, setShopType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchShops = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.shops.list({
        page: currentPage,
        limit: 10,
        search: search.trim() || undefined,
        shopType: shopType || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shops from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [currentPage, shopType, status, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchShops();
  };

  const handleQuickStatusToggle = async (shop: Shop) => {
    const nextStatus = shop.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.shops.updateStatus(shop.id, nextStatus);
      fetchShops();
    } catch (err: any) {
      alert(err.message || 'Failed to change shop status');
    }
  };

  return (
    <div className="page-container">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Shop Management</h2>
          <p className="page-desc">
            Oversee registered merchant shops, atomic Shop IDs, GPS delivery routing, and credit terms
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => fetchShops()}
            disabled={loading}
            icon={<RefreshCw size={16} className={loading ? 'spin-icon' : ''} />}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus size={18} />}
          >
            Add New Shop
          </Button>
        </div>
      </div>

      {/* 2. Search and Filter Toolbar (Clean Light Surface, 44px Controls) */}
      <div className="search-filter-toolbar">
        {/* Search Field & Search Button */}
        <form onSubmit={handleSearchSubmit} className="toolbar-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search by store name, Shop ID, phone, or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search merchant shops"
            />
          </div>
          <button type="submit" className="btn btn-primary toolbar-search-btn">
            Search
          </button>
        </form>

        {/* Dropdown Filters & Sort Control */}
        <div className="toolbar-filters-group">
          {/* Shop Type Filter */}
          <div className="filter-select-wrapper">
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={shopType}
              onChange={(e) => {
                setShopType(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by Shop Type"
            >
              <option value="">All Shop Types</option>
              <option value="Retail Shop">Retail Shop</option>
              <option value="Wholesale Shop">Wholesale Shop</option>
              <option value="Distributor">Distributor</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            className="toolbar-select-field"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {/* Sort By Filter */}
          <select
            className="toolbar-select-field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort by column"
          >
            <option value="created_at">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="shop_id">Sort by Shop ID</option>
            <option value="outstanding_balance">Sort by Balance</option>
            <option value="credit_limit">Sort by Credit Limit</option>
          </select>

          {/* Direction Toggle Button */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            className="btn btn-secondary toolbar-sort-btn"
            title={sortOrder === 'ASC' ? 'Currently Ascending (Click for Descending)' : 'Currently Descending (Click for Ascending)'}
            aria-label="Toggle sort direction"
          >
            <ArrowUpDown size={15} />
            <span>{sortOrder === 'ASC' ? 'Ascending' : 'Descending'}</span>
          </button>
        </div>
      </div>

      {/* 3. Shop Results Table */}
      <Card
        title="Affiliated Merchant Stores"
        subtitle={`Total registered merchant shops: ${data.total}`}
        noPadding
      >
        {loading ? (
          <div className="table-loading-container">
            <RefreshCw size={24} className="spin-icon text-muted" />
            <p>Retrieving live shop records from database...</p>
          </div>
        ) : error ? (
          <div className="table-error-container">
            <p className="error-message">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchShops}>
              Retry Connection
            </Button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="table-empty-container">
            <Building2 size={40} className="empty-state-icon" />
            <h4 className="empty-state-title">No matching merchant shops found</h4>
            <p className="empty-state-desc">
              Try adjusting your search criteria, clearing filters, or onboard a new merchant store.
            </p>
            <div style={{ marginTop: '16px' }}>
              <Button
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
                icon={<Plus size={16} />}
              >
                Add New Shop
              </Button>
            </div>
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Shop ID</th>
                  <th>Store Name & Type</th>
                  <th>Owner & Contact</th>
                  <th>Location & Delivery Pin</th>
                  <th>Credit & Balance</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((shop) => (
                  <tr key={shop.id}>
                    <td>
                      <code className="shop-id-code">
                        {shop.shop_id || 'N/A'}
                      </code>
                    </td>
                    <td>
                      <div className="font-semibold text-primary">{shop.name}</div>
                      <div className="text-secondary text-xs">
                        {shop.shop_type || 'Retail Shop'}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-primary">
                        {shop.owner_name}
                      </div>
                      <div className="text-secondary text-xs">
                        {shop.phone}
                      </div>
                    </td>
                    <td>
                      <div className="shop-location-row">
                        <MapPin size={13} className="text-emerald" />
                        <span>{shop.area || shop.address}, {shop.city}</span>
                      </div>
                      <div style={{ marginTop: '3px' }}>
                        <span
                          className={`badge ${shop.is_location_verified ? 'badge-info' : 'badge-neutral'}`}
                          style={{ fontSize: '10.5px' }}
                        >
                          {shop.is_location_verified ? 'GPS Pin Verified' : 'Unverified Pin'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="text-secondary text-xs">
                        Limit: ₹{Number(shop.credit_limit || 0).toLocaleString('en-IN')}
                      </div>
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color: Number(shop.outstanding_balance) > 0 ? '#B91C1C' : '#16805D',
                        }}
                      >
                        Bal: ₹{Number(shop.outstanding_balance || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td>
                      <Badge variant={shop.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {shop.status}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-group">
                        {/* Details Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShopId(shop.id);
                            setIsDetailModalOpen(true);
                          }}
                          className="btn btn-secondary btn-table-action"
                          title="View Complete Profile & Invoices"
                          aria-label={`View details for ${shop.name}`}
                        >
                          <Eye size={14} />
                          <span>Details</span>
                        </button>

                        {/* Edit Button (Icon-only) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShopToEdit(shop);
                            setIsEditModalOpen(true);
                          }}
                          className="btn-icon-square"
                          title="Edit Information"
                          aria-label={`Edit ${shop.name}`}
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Power Toggle Button (Icon-only) */}
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(shop)}
                          className={`btn-icon-square ${shop.status === 'ACTIVE' ? 'btn-power-active' : 'btn-power-inactive'}`}
                          title={shop.status === 'ACTIVE' ? 'Deactivate Shop' : 'Activate Shop'}
                          aria-label={shop.status === 'ACTIVE' ? `Deactivate ${shop.name}` : `Activate ${shop.name}`}
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {data.totalPages > 1 && (
          <div className="table-pagination-footer">
            <div className="pagination-info">
              Showing page <strong>{data.page}</strong> of <strong>{data.totalPages}</strong> ({data.total} total shops)
            </div>
            <div className="pagination-buttons">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={15} />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={currentPage >= data.totalPages}
                className="btn btn-secondary btn-sm"
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <AddShopModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onShopCreated={fetchShops}
      />

      <ShopDetailModal
        shopId={selectedShopId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedShopId(null);
        }}
        onStatusChanged={fetchShops}
      />

      <EditShopModal
        shop={shopToEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setShopToEdit(null);
        }}
        onUpdated={fetchShops}
      />
    </div>
  );
};
