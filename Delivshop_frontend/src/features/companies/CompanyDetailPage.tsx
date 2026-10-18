import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  FileText,
  Package,
  Pencil,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  Search,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Company, Product, PaginatedResult } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EditCompanyModal } from './EditCompanyModal';
import { CompanyStatusDialog } from './CompanyStatusDialog';

interface CompanyDetailPageProps {
  companyId: string;
}

export const CompanyDetailPage: React.FC<CompanyDetailPageProps> = ({ companyId }) => {
  const { navigate, goBack } = useNavigation();

  const [company, setCompany] = useState<Company | null>(null);
  const [productsData, setProductsData] = useState<PaginatedResult<Product>>({
    items: [],
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Clipboard copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Product search state
  const [productSearch, setProductSearch] = useState('');

  const fetchCompanyDetails = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.companies.get(companyId);
      setCompany(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load company details. Please verify the company exists.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchAssignedProducts = useCallback(async () => {
    if (!companyId) return;
    setProductsLoading(true);
    try {
      const res = await api.products.list({
        companyId,
        limit: 100,
        search: productSearch.trim() || undefined,
      });
      setProductsData(res);
    } catch (err: any) {
      console.warn('Failed to fetch assigned products for company:', err.message);
    } finally {
      setProductsLoading(false);
    }
  }, [companyId, productSearch]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  useEffect(() => {
    fetchAssignedProducts();
  }, [fetchAssignedProducts]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', color: '#047857' }} />
        <h3 style={{ fontSize: '15px', color: '#334155', fontWeight: 600 }}>Loading Company Facility Details...</h3>
        <p style={{ fontSize: '13px', color: '#64748B' }}>Retrieving supplier profile and assigned products catalog</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="page-container" style={{ padding: '32px 24px' }}>
        <button
          type="button"
          onClick={() => navigate('/admin/companies')}
          className="btn btn-secondary"
          style={{ marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </button>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <AlertTriangle size={42} color="#DC2626" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
              Company Not Found
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '440px', margin: '0 auto 24px auto' }}>
              {error || `The supplier company with ID "${companyId}" could not be located in the database.`}
            </p>
            <Button variant="primary" onClick={() => navigate('/admin/companies')}>
              Return to Companies Overview
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isActive = company.status === 'ACTIVE';
  const hasCoordinates = company.latitude != null && company.longitude != null;

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* 1. Breadcrumbs & Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/companies')}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Companies</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <span>Facility Management</span>
            <span>/</span>
            <span>Companies</span>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>{company.name}</span>
          </div>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <Pencil size={15} />
            <span>Edit Company</span>
          </button>
          <button
            type="button"
            onClick={() => setIsStatusOpen(true)}
            className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <Power size={15} />
            <span>{isActive ? 'Deactivate' : 'Activate'}</span>
          </button>
        </div>
      </div>

      {/* 2. Company Identity Header Card */}
      <Card style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#166534',
                fontWeight: 800,
                fontSize: '20px',
              }}
            >
              <Building2 size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {company.name}
                </h1>
                <Badge variant={isActive ? 'success' : 'danger'}>
                  {company.status}
                </Badge>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {company.companyType}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748B', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Code:</span>
                  <code style={{ fontWeight: 700, color: '#0F172A', backgroundColor: '#F8FAFC', padding: '1px 6px', borderRadius: '4px' }}>
                    {company.companyCode}
                  </code>
                </div>
                <div>City: <strong style={{ color: '#334155' }}>{company.city}, {company.state}</strong></div>
                <div>Registered: <strong style={{ color: '#334155' }}>{formatDate(company.createdAt)}</strong></div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857' }}>
                {productsData.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Assigned Products
              </div>
            </div>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '8px',
                backgroundColor: hasCoordinates ? '#F0FDF4' : '#FEF3C7',
                border: `1px solid ${hasCoordinates ? '#BBF7D0' : '#FDE68A'}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 800, color: hasCoordinates ? '#166534' : '#B45309' }}>
                {hasCoordinates ? 'GPS Verified' : 'GPS Missing'}
              </div>
              <div style={{ fontSize: '11px', color: hasCoordinates ? '#15803D' : '#92400E', fontWeight: 600 }}>
                {hasCoordinates ? 'Ready for Proximity' : 'Needs Location Setup'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Company Info Grid: Contact, Address, Tax & Legal, GPS Location */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card A: Contact Person & Communications */}
        <Card title="Primary Contacts & Communication" style={{ height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#047857" />
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Contact Person / Facility Manager</div>
                <div style={{ fontWeight: 600, color: '#1E293B' }}>{company.contactPerson}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={16} color="#047857" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Primary Phone</div>
                <div style={{ fontWeight: 600, color: '#1E293B' }}>{company.phone}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(company.phone, 'phone')}
                title="Copy Phone"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                {copiedField === 'phone' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} color="#047857" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Official Email Address</div>
                <div style={{ fontWeight: 600, color: '#1E293B' }}>{company.email}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(company.email, 'email')}
                title="Copy Email"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                {copiedField === 'email' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              </button>
            </div>

            {company.altPhone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="#94A3B8" />
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Alternative Phone</div>
                  <div style={{ fontWeight: 500, color: '#475569' }}>{company.altPhone}</div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        {/* Card B: Facility Physical Address & GPS Location */}
        <Card title="Physical Loading Address & GPS Location" style={{ height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={16} color="#047857" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Pickup & Loading Entrance Address</div>
                <div style={{ fontWeight: 600, color: '#1E293B', lineHeight: '1.4' }}>
                  {company.addressLine1}
                  {company.addressLine2 ? `, ${company.addressLine2}` : ''}
                </div>
                <div style={{ color: '#475569', marginTop: '2px' }}>
                  {company.city}, {company.state} - {company.postalCode}, {company.country}
                </div>
              </div>
            </div>

            {/* GPS Location Section */}
            <div
              style={{
                marginTop: '4px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: hasCoordinates ? '#F8FAFC' : '#FEF3C7',
                border: `1px solid ${hasCoordinates ? '#E2E8F0' : '#FDE68A'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: hasCoordinates ? '#0F172A' : '#92400E' }}>
                  {hasCoordinates ? 'Saved Pickup Coordinates (300m Proximity)' : '⚠️ GPS Coordinates Missing'}
                </span>
                {hasCoordinates && (
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} /> Active
                  </span>
                )}
              </div>

              {hasCoordinates ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'monospace', color: '#047857', fontWeight: 600 }}>
                    <span>Lat: {Number(company.latitude).toFixed(7)}</span>
                    <span>•</span>
                    <span>Lng: {Number(company.longitude).toFixed(7)}</span>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <a
                      href={`https://www.google.com/maps?q=${company.latitude},${company.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ExternalLink size={12} />
                      <span>Open on Google Maps</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '12px', color: '#92400E', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                    This company does not have verified GPS coordinates. Driver mobile proximity checks require coordinates to unlock pickup quantities.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
                    Set Location Coordinates Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Card C: Tax, Compliance & Notes */}
        <Card title="Tax, Legal & Operational Notes" style={{ height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#047857" />
                <span style={{ color: '#64748B' }}>GSTIN:</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <code style={{ fontWeight: 700, color: '#1E293B', backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px' }}>
                  {company.gstin || 'Not Provided'}
                </code>
                {company.gstin && (
                  <button
                    type="button"
                    onClick={() => handleCopy(company.gstin!, 'gstin')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    {copiedField === 'gstin' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#047857" />
                <span style={{ color: '#64748B' }}>PAN:</span>
              </div>
              <code style={{ fontWeight: 700, color: '#1E293B', backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px' }}>
                {company.pan || 'Not Provided'}
              </code>
            </div>

            {company.registrationNumber ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#047857" />
                  <span style={{ color: '#64748B' }}>Registration #:</span>
                </div>
                <span style={{ fontWeight: 600, color: '#1E293B' }}>{company.registrationNumber}</span>
              </div>
            ) : null}

            {company.notes ? (
              <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Operational Notes:</div>
                <div style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '6px' }}>
                  {company.notes}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {/* 4. Assigned Products Section (End-to-End Company-Product Relationship) */}
      <Card
        title={`Assigned Products Supplied by ${company.name}`}
        subtitle={`Products linked to this company in the catalog (${productsData.total} items)`}
        style={{ marginBottom: '24px' }}
      >
        {/* Search bar inside assigned products */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Filter assigned products by name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fetchAssignedProducts()}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <RefreshCw size={13} className={productsLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <span>Manage in Product Catalog →</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
        {productsLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#047857' }} />
            <div>Loading assigned products...</div>
          </div>
        ) : productsData.items.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center' }}>
            <Package size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              No products assigned to this company.
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '0 auto 16px auto' }}>
              When products are created or edited in the Product Catalog and associated with {company.name}, they will automatically appear here.
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/products')}>
              Open Product Catalog to Assign Products
            </Button>
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU / Code</th>
                  <th>Category</th>
                  <th>Pack Size & Unit</th>
                  <th style={{ textAlign: 'right' }}>Selling Price</th>
                  <th style={{ textAlign: 'center' }}>Stock Quantity</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productsData.items.map((prod) => {
                  const isProdActive = prod.isActive ?? prod.is_active ?? true;
                  const stock = prod.stockQuantity ?? (prod as any).stock_quantity ?? 0;
                  const price = prod.price ? Number(prod.price) : 0;

                  return (
                    <tr key={prod.id}>
                      {/* Name */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                          {prod.name}
                        </div>
                        {prod.description && (
                          <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prod.description}
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td>
                        <code style={{ fontSize: '11.5px', color: '#047857', backgroundColor: '#F0FDF4', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {prod.sku}
                        </code>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                          {prod.category || 'Dairy'}
                        </span>
                      </td>

                      {/* Pack Size & Unit */}
                      <td>
                        <span style={{ fontSize: '12px', color: '#334155' }}>
                          {prod.packSize || (prod as any).pack_size || '1 unit'}
                          {' • '}
                          {prod.baseUnit || (prod as any).base_unit || 'Unit'}
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Stock */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: stock <= 10 ? (stock === 0 ? '#DC2626' : '#D97706') : '#059669',
                            backgroundColor: stock <= 10 ? (stock === 0 ? '#FEE2E2' : '#FEF3C7') : '#DCFCE7',
                            padding: '2px 8px',
                            borderRadius: '10px',
                          }}
                        >
                          {stock} in stock
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <Badge variant={isProdActive ? 'success' : 'neutral'}>
                          {isProdActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => navigate('/admin/products')}
                          className="btn btn-secondary btn-table-action"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          <span>Catalog View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Company Modal */}
      {isEditOpen && (
        <EditCompanyModal
          company={company}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onCompanyUpdated={() => {
            fetchCompanyDetails();
            setIsEditOpen(false);
          }}
        />
      )}

      {/* Status Toggle Dialog */}
      {isStatusOpen && (
        <CompanyStatusDialog
          company={company}
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          onStatusChanged={() => {
            fetchCompanyDetails();
            setIsStatusOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default CompanyDetailPage;
