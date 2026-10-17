import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Building2,
  Tag,
  DollarSign,
  Boxes,
  Thermometer,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Company, Product, UpdateProductPayload } from '../../types';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}

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

const BASE_UNITS = [
  'Litre',
  'ml',
  'Kilogram',
  'g',
  'Piece',
  'Pack',
  'Carton',
  'Crate',
];

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdated,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [category, setCategory] = useState('Milk');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [baseUnit, setBaseUnit] = useState('Litre');
  const [packSize, setPackSize] = useState('1000 ml Pouch');
  const [unitsPerPack, setUnitsPerPack] = useState<number>(1);
  const [purchaseUnit, setPurchaseUnit] = useState('Crate');
  const [sellingUnit, setSellingUnit] = useState('Piece');
  const [shelfLifeDays, setShelfLifeDays] = useState<number>(7);

  const [purchaseCost, setPurchaseCost] = useState<number>(45.0);
  const [price, setPrice] = useState<number>(60.0);
  const [taxRate, setTaxRate] = useState<number>(5);
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);

  const [minStockThreshold, setMinStockThreshold] = useState<number>(15);
  const [reorderQuantity, setReorderQuantity] = useState<number>(50);

  const [fatPercentage, setFatPercentage] = useState<string>('4.5');
  const [snfPercentage, setSnfPercentage] = useState<string>('8.5');
  const [storageTemperature, setStorageTemperature] = useState('2°C to 4°C (Refrigerated)');
  const [fssaiLicense, setFssaiLicense] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setName(product.name || '');
      setCompanyId(product.companyId || (product.company?.id as string) || '');
      setCategory(product.category || 'Milk');
      setBrand(product.brand || '');
      setDescription(product.description || '');
      setImageUrl(product.imageUrl || '');
      setIsActive(product.isActive ?? true);
      setBaseUnit(product.baseUnit || 'Litre');
      setPackSize(product.packSize || '1000 ml Pouch');
      setUnitsPerPack(Number(product.unitsPerPack || 1));
      setPurchaseUnit(product.purchaseUnit || 'Crate');
      setSellingUnit(product.sellingUnit || 'Piece');
      setShelfLifeDays(product.shelfLifeDays ? Number(product.shelfLifeDays) : 7);
      setPurchaseCost(Number(product.purchaseCost || 0));
      setPrice(Number(product.price || 0));
      setTaxRate(Number(product.taxRate || 0));
      setIsTaxInclusive(Boolean(product.isTaxInclusive ?? true));
      setMinStockThreshold(Number(product.minStockThreshold || 10));
      setReorderQuantity(Number(product.reorderQuantity || 50));
      setFatPercentage(product.fatPercentage ? String(product.fatPercentage) : '');
      setSnfPercentage(product.snfPercentage ? String(product.snfPercentage) : '');
      setStorageTemperature(product.storageTemperature || '2°C to 4°C (Refrigerated)');
      setFssaiLicense(product.fssaiLicense || '');
      setErrors({});
      setServerError(null);
      setSuccessMessage(null);

      // Load companies
      setCompaniesLoading(true);
      api.companies
        .list({ status: 'ACTIVE', limit: 100 })
        .then((res) => {
          setCompanies(res.items || []);
        })
        .catch((err) => console.warn(err.message))
        .finally(() => setCompaniesLoading(false));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Product name is required';
    if (!companyId) errs.companyId = 'Supplier company is required';
    if (price < 0 || isNaN(price)) errs.price = 'Selling price cannot be negative';
    if (purchaseCost < 0 || isNaN(purchaseCost)) errs.purchaseCost = 'Purchase cost cannot be negative';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: UpdateProductPayload = {
        name: name.trim(),
        companyId,
        category,
        brand: brand.trim() || null,
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        isActive,
        baseUnit,
        packSize,
        unitsPerPack: Number(unitsPerPack),
        purchaseUnit: purchaseUnit || null,
        sellingUnit: sellingUnit || null,
        purchaseCost: Number(purchaseCost),
        price: Number(price),
        minStockThreshold: Number(minStockThreshold),
        reorderQuantity: Number(reorderQuantity),
        taxRate: Number(taxRate),
        isTaxInclusive,
        storageTemperature: storageTemperature || null,
        shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : null,
        fatPercentage: fatPercentage ? Number(fatPercentage) : null,
        snfPercentage: snfPercentage ? Number(snfPercentage) : null,
        fssaiLicense: fssaiLicense.trim() || null,
      };

      await api.products.update(product.id, payload);
      setSuccessMessage('Product updated successfully.');
      onProductUpdated();

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update product';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAF9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                  Edit Dairy Product
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <Lock size={11} />
                  {product.sku}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Update pricing, supplier contract, stock thresholds, and specifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#64748B',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {serverError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{serverError}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '8px',
                color: '#166534',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <Package size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Product Information & Supplier
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Product Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.name ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Supplier Company <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={companiesLoading}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Dairy Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  {DAIRY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Brand Label
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ACTIVE">Active (Available for Orders)</option>
                  <option value="INACTIVE">Inactive (Suspended)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Packaging */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <DollarSign size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Pricing & Packaging
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Purchase Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Selling Price (₹) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.price ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Pack Size
                </label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStockThreshold}
                  onChange={(e) => setMinStockThreshold(parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dairy Specs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <Thermometer size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Quality Specs & Temperature
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Fat %
                </label>
                <input
                  type="text"
                  value={fatPercentage}
                  onChange={(e) => setFatPercentage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  SNF %
                </label>
                <input
                  type="text"
                  value={snfPercentage}
                  onChange={(e) => setSnfPercentage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Storage Temperature
                </label>
                <input
                  type="text"
                  value={storageTemperature}
                  onChange={(e) => setStorageTemperature(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  FSSAI License No.
                </label>
                <input
                  type="text"
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid #D6D3C8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #A7AE9F',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#94A3B8' : 'var(--color-primary)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

