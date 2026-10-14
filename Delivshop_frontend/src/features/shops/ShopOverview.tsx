import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Power,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Shop, PaginatedResult } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Shop Management</h2>
          <p className="page-desc">
            Oversee registered merchant shops, atomic Shop IDs, GPS delivery routing, and credit terms
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => fetchShops()}
            className="btn btn-outline"
            style={{ gap: '6px' }}
            title="Refresh Directory"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{ gap: '8px' }}
          >
            <Plus size={16} />
            Add New Shop
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                className="input-field"
                style={{ width: '100%', paddingLeft: '36px', height: '38px', margin: 0 }}
                placeholder="Search by store name, Shop ID, phone, or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 16px', height: '38px' }}>
              Search
            </button>
          </form>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="input-field"
                style={{ height: '38px', padding: '0 12px', margin: 0, fontSize: '13px' }}
                value={shopType}
                onChange={(e) => {
                  setShopType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Shop Types</option>
                <option value="Retail Shop">Retail Shop</option>
                <option value="Wholesale Shop">Wholesale Shop</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>

            <select
              className="input-field"
              style={{ height: '38px', padding: '0 12px', margin: 0, fontSize: '13px' }}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              className="input-field"
              style={{ height: '38px', padding: '0 12px', margin: 0, fontSize: '13px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_at">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="shop_id">Sort by Shop ID</option>
              <option value="outstanding_balance">Sort by Balance</option>
              <option value="credit_limit">Sort by Credit Limit</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="btn btn-outline btn-sm"
              style={{ height: '38px' }}
              title="Toggle Sort Order"
            >
              {sortOrder === 'ASC' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
        </div>
      </Card>

      {/* Directory Table */}
      <Card title="Affiliated Merchant Stores" subtitle={`Total registered shops: ${data.total}`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Retrieving live shop records from database...
          </div>
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : data.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <Building2 size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>
              No matching merchant shops found
            </div>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Create a new shop or adjust your search and filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shop ID</th>
                  <th>Store Name & Type</th>
                  <th>Owner & Contact</th>
                  <th>Location & Verification</th>
                  <th>Credit & Balance</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((shop) => (
                  <tr key={shop.id}>
                    <td>
                      <code style={{ fontWeight: 700, fontSize: '13px' }}>
                        {shop.shop_id || 'N/A'}
                      </code>
                    </td>
                    <td>
                      <div className="font-semibold">{shop.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {shop.shop_type}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {shop.owner_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {shop.phone}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="var(--color-primary)" />
                        <span>{shop.area || shop.address}, {shop.city}</span>
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <span
                          className={`badge ${shop.is_location_verified ? 'badge-info' : 'badge-default'}`}
                          style={{ fontSize: '10px', padding: '2px 6px' }}
                        >
                          {shop.is_location_verified ? 'GPS Pin Verified' : 'Unverified Pin'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Limit: ₹{Number(shop.credit_limit || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: Number(shop.outstanding_balance) > 0 ? '#F87171' : '#34D399' }}>
                        Bal: ₹{Number(shop.outstanding_balance || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td>
                      <Badge variant={shop.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {shop.status}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShopId(shop.id);
                            setIsDetailModalOpen(true);
                          }}
                          className="btn btn-outline btn-sm"
                          title="View Complete Profile & Invoices"
                          style={{ padding: '6px 10px' }}
                        >
                          <Eye size={13} /> Details
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShopToEdit(shop);
                            setIsEditModalOpen(true);
                          }}
                          className="btn btn-outline btn-sm"
                          title="Edit Information"
                          style={{ padding: '6px 8px' }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(shop)}
                          className="btn btn-outline btn-sm"
                          title={shop.status === 'ACTIVE' ? 'Deactivate Shop' : 'Activate Shop'}
                          style={{ padding: '6px 8px' }}
                        >
                          <Power size={13} color={shop.status === 'ACTIVE' ? '#EF4444' : '#10B981'} />
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Page {data.page} of {data.totalPages} ({data.total} total shops)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn btn-outline btn-sm"
                style={{ gap: '4px' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
                disabled={currentPage >= data.totalPages}
                className="btn btn-outline btn-sm"
                style={{ gap: '4px' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Shop Modal */}
      <AddShopModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onShopCreated={fetchShops}
      />

      {/* View Shop Details Modal */}
      <ShopDetailModal
        shopId={selectedShopId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedShopId(null);
        }}
        onStatusChanged={fetchShops}
      />

      {/* Edit Shop Modal */}
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
