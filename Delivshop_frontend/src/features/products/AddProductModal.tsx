import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Building2,
  Tag,
  DollarSign,
  Boxes,
  Thermometer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Company, CreateProductPayload } from '../../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
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
  'Khoa',
  'Other Dairy Products',
];

const BASE_UNITS = [
  'Litre',
  'ml',
  'Kilogram',
  'g',
  'Piece',
  'Pack',
];

const SELLING_UNITS = [
  'Pouch',
  'Bottle',
  'Pack',
  'Block',
  'Cup',
  'Tin',
  'Piece',
  'Litre',
  'Kilogram',
];

const PURCHASE_UNITS = [
  'Crate',
  'Box',
  'Carton',
  'Tub',
  'Bag',
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  // Companies for supplier selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Form Fields - Section 1: Basic
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Milk');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Section 2: Supplier
  const [companyId, setCompanyId] = useState('');

  // Section 3: Packaging & Units
  const [baseUnit, setBaseUnit] = useState('Litre');
  const [packSize, setPackSize] = useState('1000 ml Pouch');
  const [unitsPerPack, setUnitsPerPack] = useState<number>(1);
  const [purchaseUnit, setPurchaseUnit] = useState('Crate');
  const [sellingUnit, setSellingUnit] = useState('Piece');
  const [shelfLifeDays, setShelfLifeDays] = useState<number>(7);

  // Section 4: Pricing & Taxes
  const [purchaseCost, setPurchaseCost] = useState<number>(45.0);
  const [price, setPrice] = useState<number>(60.0);
  const [taxRate, setTaxRate] = useState<number>(5);
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [minSellingPrice, setMinSellingPrice] = useState<string>('');

  // Section 5: Stock Configuration
  const [initialStock, setInitialStock] = useState<number>(0);
  const [minStockThreshold, setMinStockThreshold] = useState<number>(15);
  const [reorderQuantity, setReorderQuantity] = useState<number>(50);
  const [initialBatchNumber, setInitialBatchNumber] = useState('');
  const [initialExpiryDate, setInitialExpiryDate] = useState('');
  const [initialManufacturingDate, setInitialManufacturingDate] = useState('');

  // Section 6: Dairy Specs
  const [fatPercentage, setFatPercentage] = useState<string>('4.5');
  const [snfPercentage, setSnfPercentage] = useState<string>('8.5');
  const [storageTemperature, setStorageTemperature] = useState('2°C to 4°C (Refrigerated)');
  const [fssaiLicense, setFssaiLicense] = useState('');

  // Status & Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch active companies on mount / open
  useEffect(() => {
    if (isOpen) {
      setCompaniesLoading(true);
      api.companies
        .list({ status: 'ACTIVE', limit: 100 })
        .then((res) => {
          setCompanies(res.items || []);
          if (res.items && res.items.length > 0 && !companyId) {
            setCompanyId(res.items[0].id);
          }
        })
        .catch((err) => {
          console.warn('Failed to load supplier companies:', err.message);
        })
        .finally(() => setCompaniesLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const isLiquid = ['Milk', 'Buttermilk', 'Chaas', 'Flavoured Milk', 'Lassi'].some(
      (c) => newCat.toLowerCase().includes(c.toLowerCase())
    );
    const isSolid = ['Butter', 'Khoa', 'Paneer', 'Curd', 'Yogurt', 'Ghee', 'Cheese'].some(
      (c) => newCat.toLowerCase().includes(c.toLowerCase())
    );
    if (isLiquid && (baseUnit === 'Kilogram' || baseUnit === 'g')) {
      setBaseUnit('Litre');
    } else if (isSolid && (baseUnit === 'Litre' || baseUnit === 'ml')) {
      setBaseUnit('Kilogram');
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Product name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Product name must be at least 2 characters';
    }

    if (!companyId) {
      errs.companyId = 'Please select a supplier company';
    }

    if (!category.trim()) {
      errs.category = 'Category is required';
    }

    if (!baseUnit.trim()) {
      errs.baseUnit = 'Base unit is required';
    }

    const isLiquid = ['Milk', 'Buttermilk', 'Chaas', 'Flavoured Milk', 'Lassi'].some(
      (c) => category.toLowerCase().includes(c.toLowerCase())
    );
    const isSolid = ['Butter', 'Khoa', 'Paneer', 'Curd', 'Yogurt', 'Ghee', 'Cheese'].some(
      (c) => category.toLowerCase().includes(c.toLowerCase())
    );

    if (isLiquid && (baseUnit === 'Kilogram' || baseUnit === 'g')) {
      errs.baseUnit = `Liquid dairy category "${category}" cannot use weight units (Kilogram/g). Please select Litre or ml.`;
    }
    if (isSolid && (baseUnit === 'Litre' || baseUnit === 'ml')) {
      errs.baseUnit = `Solid dairy category "${category}" cannot use volume units (Litre/ml). Please select Kilogram or g.`;
    }

    if (!packSize.trim()) {
      errs.packSize = 'Pack size description is required';
    }

    if (unitsPerPack <= 0) {
      errs.unitsPerPack = 'Units per pack must be greater than 0';
    }

    if (price < 0 || isNaN(price)) {
      errs.price = 'Selling price cannot be negative';
    }

    if (purchaseCost < 0 || isNaN(purchaseCost)) {
      errs.purchaseCost = 'Purchase cost cannot be negative';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setName('');
    setSku('');
    setCategory('Milk');
    setBrand('');
    setDescription('');
    setImageUrl('');
    setIsActive(true);
    setBaseUnit('Litre');
    setPackSize('1000 ml Pouch');
    setUnitsPerPack(1);
    setPurchaseCost(45.0);
    setPrice(60.0);
    setTaxRate(5);
    setInitialStock(0);
    setMinStockThreshold(15);
    setReorderQuantity(50);
    setInitialBatchNumber('');
    setInitialExpiryDate('');
    setInitialManufacturingDate('');
    setFatPercentage('4.5');
    setSnfPercentage('8.5');
    setFssaiLicense('');
    setErrors({});
    setServerError(null);
  };

  const handleSubmit = async (e?: React.FormEvent, addAnother = false) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload: CreateProductPayload = {
        companyId,
        name: name.trim(),
        sku: sku.trim() || undefined,
        category,
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        isActive,
        baseUnit,
        packSize,
        unitsPerPack: Number(unitsPerPack),
        purchaseUnit: purchaseUnit || undefined,
        sellingUnit: sellingUnit || undefined,
        purchaseCost: Number(purchaseCost),
        price: Number(price),
        minStockThreshold: Number(minStockThreshold),
        taxRate: Number(taxRate),
        isTaxInclusive,
        minSellingPrice: minSellingPrice ? Number(minSellingPrice) : undefined,
        trackInventory: false,
        trackBatches: false,
        storageTemperature: storageTemperature || undefined,
        shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : undefined,
        fatPercentage: fatPercentage ? Number(fatPercentage) : undefined,
        snfPercentage: snfPercentage ? Number(snfPercentage) : undefined,
        fssaiLicense: fssaiLicense.trim() || undefined,
        initialStock: Number(initialStock),
        initialBatchNumber: initialBatchNumber.trim() || undefined,
        initialExpiryDate: initialExpiryDate || undefined,
        initialManufacturingDate: initialManufacturingDate || undefined,
      };

      const created = await api.products.create(payload);
      onProductCreated();

      if (addAnother) {
        setSuccessMessage(`Product "${created.name}" created with SKU ${created.sku}. Ready for next product.`);
        resetForm();
      } else {
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create product';
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
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
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
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                Add New Dairy Product
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Register a new catalogue item with supplier linkage, pricing, and opening stock
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

        {/* Scrollable Form Body */}
        <form
          onSubmit={(e) => handleSubmit(e, false)}
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

          {/* Section 1: Basic Product Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <Package size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Basic Product Information
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
                  placeholder="e.g. Fresh Standardized Milk 500ml"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.name ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.name && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  SKU / Product Code (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. MLK-FCM-1L"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Dairy Category <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
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
                  Brand / Producer Label
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Sahyadri Farm"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
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
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ACTIVE">Active (Available for Orders)</option>
                  <option value="INACTIVE">Inactive (Catalogue Draft)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description & Specialization
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description, pasteurization method, packaging details..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #A7AE9F',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Section 2: Supplier Company (Mandatory Relationship) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #D6D3C8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Supplier Company (Mandatory Relationship)
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
              Every dairy product in Delivshop must be supplied by an active, registered company for dispatch and procurement.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Select Active Supplier Company <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={companiesLoading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${errors.companyId ? '#EF4444' : '#A7AE9F'}`,
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {companies.length === 0 ? (
                  <option value="">{companiesLoading ? 'Loading companies...' : 'No active companies found'}</option>
                ) : (
                  companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyCode}) — {c.city}
                    </option>
                  ))
                )}
              </select>
              {errors.companyId && (
                <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {errors.companyId}
                </span>
              )}
            </div>
          </div>

          {/* Section 3: Packaging & Units */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #D6D3C8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Packaging & Measurement Units
                </h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: ['Milk', 'Buttermilk', 'Chaas', 'Flavoured Milk', 'Lassi'].some(c => category.toLowerCase().includes(c.toLowerCase()))
                    ? '#EFF6FF'
                    : '#FEF3C7',
                  color: ['Milk', 'Buttermilk', 'Chaas', 'Flavoured Milk', 'Lassi'].some(c => category.toLowerCase().includes(c.toLowerCase()))
                    ? '#1E40AF'
                    : '#92400E',
                }}
              >
                {['Milk', 'Buttermilk', 'Chaas', 'Flavoured Milk', 'Lassi'].some(c => category.toLowerCase().includes(c.toLowerCase()))
                  ? 'Liquid Volume Dimension (Litres / ml)'
                  : 'Solid Mass Dimension (Kilograms / g)'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Base Unit (Physical Metric) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.baseUnit ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {BASE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                {errors.baseUnit && (
                  <span style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    {errors.baseUnit}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Pack Size Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. 500 ml Pouch, 1L Bottle"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.packSize ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.packSize && (
                  <span style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    {errors.packSize}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Selling Unit (Order Item)
                </label>
                <select
                  value={sellingUnit}
                  onChange={(e) => setSellingUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {SELLING_UNITS.map((su) => (
                    <option key={su} value={su}>
                      {su}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Transport / Purchase Unit
                </label>
                <select
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {PURCHASE_UNITS.map((pu) => (
                    <option key={pu} value={pu}>
                      {pu}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Units per Crate / Case <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerPack}
                  onChange={(e) => setUnitsPerPack(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.unitsPerPack ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Shelf Life (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={shelfLifeDays}
                  onChange={(e) => setShelfLifeDays(parseInt(e.target.value, 10) || 7)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Pricing & Taxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <DollarSign size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Commercial Pricing & Tax
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
                  placeholder="45.00"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
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
                  placeholder="60.00"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.price ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.price && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.price}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  GST Tax Rate (%)
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value={0}>0% (Exempt / Fresh Milk)</option>
                  <option value={5}>5% (Packaged Paneer / Curd)</option>
                  <option value={12}>12% (Ghee / Butter / Cheese)</option>
                  <option value={18}>18% (Flavoured Drinks / Condensed)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isTaxInclusive}
                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                  />
                  <span>Prices are Tax-Inclusive</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 5: Direct Supply Distribution Model */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Building2 size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                5. Direct Supplier-to-Shop Distribution
              </h3>
            </div>
            <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Delivshop operates without warehouse inventory. When shops place orders, requirements are aggregated by supplier and collected by drivers for direct delivery runs. No inward warehouse stocking is required.
            </p>
          </div>


          {/* Section 6: Dairy Quality Specifications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <Thermometer size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                6. Dairy Quality & Storage Specifications
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Fat % (e.g. 4.5% or 6.0%)
                </label>
                <input
                  type="text"
                  value={fatPercentage}
                  onChange={(e) => setFatPercentage(e.target.value)}
                  placeholder="4.5"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  SNF % (e.g. 8.5% or 9.0%)
                </label>
                <input
                  type="text"
                  value={snfPercentage}
                  onChange={(e) => setSnfPercentage(e.target.value)}
                  placeholder="8.5"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
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
                  placeholder="2°C to 4°C"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
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
                  placeholder="11521019000123"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid #D6D3C8',
              display: 'flex',
              flexWrap: 'wrap',
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
              type="button"
              onClick={() => handleSubmit(undefined, true)}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #A7AE9F',
                backgroundColor: '#FAFAF9',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <PlusCircle size={15} />
              Save & Add Another
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
                  Registering Product...
                </>
              ) : (
                'Save Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

