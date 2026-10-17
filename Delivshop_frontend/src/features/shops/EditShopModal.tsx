import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { ApiError } from '../../services/api/client';
import { Shop, ShopType, PaymentTerms } from '../../types';

interface EditShopModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditShopModal: React.FC<EditShopModalProps> = ({
  shop,
  isOpen,
  onClose,
  onUpdated,
}) => {
  if (!isOpen || !shop) return null;

  const [name, setName] = useState(shop.name || '');
  const [shopType, setShopType] = useState<ShopType>(shop.shop_type || 'Retail Shop');
  const [ownerName, setOwnerName] = useState(shop.owner_name || '');
  const [phone, setPhone] = useState(shop.phone || '');
  const [email, setEmail] = useState(shop.email || '');

  const [address, setAddress] = useState(shop.address || '');
  const [area, setArea] = useState(shop.area || '');
  const [landmark, setLandmark] = useState(shop.landmark || '');
  const [city, setCity] = useState(shop.city || 'Nashik');
  const [state, setState] = useState(shop.state || 'Maharashtra');
  const [pincode, setPincode] = useState(shop.pincode || '');

  const [latitude, setLatitude] = useState(shop.latitude !== null && shop.latitude !== undefined ? String(shop.latitude) : '');
  const [longitude, setLongitude] = useState(shop.longitude !== null && shop.longitude !== undefined ? String(shop.longitude) : '');

  const [deliveryContactName, setDeliveryContactName] = useState(shop.delivery_contact_name || '');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState(shop.delivery_contact_phone || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState(shop.delivery_instructions || '');
  const [deliveryWindow, setDeliveryWindow] = useState(shop.delivery_window || '');

  const [gstin, setGstin] = useState(shop.gstin || '');
  const [billingAddress, setBillingAddress] = useState(shop.billing_address || '');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(shop.payment_terms || 'Advance Payment');
  const [creditLimit, setCreditLimit] = useState(String(shop.credit_limit ?? 0));
  const [notes, setNotes] = useState(shop.notes || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    setSuccessMsg(null);

    // Client-side validations
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errors['name'] = 'Shop name must be at least 2 characters';
    }

    if (!ownerName.trim() || ownerName.trim().length < 2) {
      errors['ownerName'] = 'Owner name must be at least 2 characters';
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      errors['phone'] = 'Valid mobile number with at least 10 digits is required';
    }

    if (!address.trim() || address.trim().length < 5) {
      errors['address'] = 'Street address must be at least 5 characters';
    }

    if (!area.trim() || area.trim().length < 2) {
      errors['area'] = 'Area or locality is required';
    }

    const cleanPincode = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      errors['pincode'] = 'PIN code must be a valid 6-digit Indian postal code (e.g. 422001)';
    }

    // Coordinates validation
    let latNum: number | null = null;
    let lngNum: number | null = null;

    if (latitude.trim() !== '' || longitude.trim() !== '') {
      if (latitude.trim() === '' || longitude.trim() === '') {
        errors['latitude'] = 'Both Latitude and Longitude must be provided together';
      } else {
        latNum = parseFloat(latitude.trim());
        lngNum = parseFloat(longitude.trim());

        if (isNaN(latNum) || latNum < -90 || latNum > 90) {
          errors['latitude'] = 'Latitude must be a valid number between -90 and 90';
        }
        if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
          errors['longitude'] = 'Longitude must be a valid number between -180 and 180';
        }
      }
    }

    const parsedCreditLimit = creditLimit.trim() === '' ? 0 : parseFloat(creditLimit.trim());
    if (isNaN(parsedCreditLimit) || parsedCreditLimit < 0) {
      errors['creditLimit'] = 'Credit limit must be a non-negative amount';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please correct the highlighted fields before saving.');
      setSubmitting(false);
      return;
    }

    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        shopType,
        ownerName: ownerName.trim(),
        phone: cleanPhone,
        email: email.trim() || null,
        address: address.trim(),
        area: area.trim(),
        landmark: landmark.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: cleanPincode,
        latitude: latNum,
        longitude: lngNum,
        deliveryContactName: deliveryContactName.trim() || null,
        deliveryContactPhone: deliveryContactPhone.trim() || null,
        deliveryInstructions: deliveryInstructions.trim() || null,
        deliveryWindow: deliveryWindow.trim() || null,
        gstin: gstin.trim().toUpperCase() || null,
        billingAddress: billingAddress.trim() || null,
        paymentTerms,
        creditLimit: isNaN(parsedCreditLimit) ? 0 : parsedCreditLimit,
        notes: notes.trim() || null,
      };

      await api.shops.update(shop.id, payload);
      setSuccessMsg('Shop profile updated successfully!');
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 700);
    } catch (err: any) {
      if (err instanceof ApiError && err.details) {
        const backendErrors: Record<string, string> = {};
        const detailMessages: string[] = [];

        for (const [key, msgs] of Object.entries(err.details)) {
          const shortKey = key.replace(/^body\./, '');
          const msg = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          backendErrors[shortKey] = msg;
          detailMessages.push(`${shortKey}: ${msg}`);
        }
        setFieldErrors(backendErrors);
        setError(`Validation failed: ${detailMessages.join(' • ')}`);
      } else {
        setError(err.message || 'Failed to update shop details. Please verify your inputs.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D6D3C8',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -15px rgba(18, 59, 50, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Edit Shop Profile
            </h3>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
              Store: <strong style={{ color: 'var(--text-primary)' }}>{shop.name}</strong> • ID: <code style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{shop.shop_id}</code>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }} noValidate>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
              role="alert"
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#166534',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={18} style={{ color: '#10B981' }} />
              <div>{successMsg}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            {/* Shop Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-shop-name">
                Shop Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="edit-shop-name"
                className={`input-field ${fieldErrors['name'] ? 'input-field-error' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors['name']) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                required
              />
              {fieldErrors['name'] && <span className="field-error-text">{fieldErrors['name']}</span>}
            </div>

            {/* Shop Type */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-shop-type">
                Shop Type <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                id="edit-shop-type"
                className="input-field"
                value={shopType}
                onChange={(e) => setShopType(e.target.value as ShopType)}
              >
                <option value="Retail Shop">Retail Shop</option>
                <option value="Wholesale Shop">Wholesale Shop</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>

            {/* Owner Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-owner-name">
                Owner Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="edit-owner-name"
                className={`input-field ${fieldErrors['ownerName'] ? 'input-field-error' : ''}`}
                value={ownerName}
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  if (fieldErrors['ownerName']) setFieldErrors((prev) => ({ ...prev, ownerName: '' }));
                }}
                required
              />
              {fieldErrors['ownerName'] && <span className="field-error-text">{fieldErrors['ownerName']}</span>}
            </div>

            {/* Mobile Phone */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-phone">
                Mobile Number <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="edit-phone"
                className={`input-field ${fieldErrors['phone'] ? 'input-field-error' : ''}`}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors['phone']) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="10-digit mobile number"
                required
              />
              {fieldErrors['phone'] && <span className="field-error-text">{fieldErrors['phone']}</span>}
            </div>

            {/* Email */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-email">Email Address</label>
              <input
                id="edit-email"
                type="email"
                className={`input-field ${fieldErrors['email'] ? 'input-field-error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@example.com (optional)"
              />
              {fieldErrors['email'] && <span className="field-error-text">{fieldErrors['email']}</span>}
            </div>

            {/* Street Address */}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="edit-address">
                Street Address <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="edit-address"
                className={`input-field ${fieldErrors['address'] ? 'input-field-error' : ''}`}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (fieldErrors['address']) setFieldErrors((prev) => ({ ...prev, address: '' }));
                }}
                required
              />
              {fieldErrors['address'] && <span className="field-error-text">{fieldErrors['address']}</span>}
            </div>

            {/* Area / Locality */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-area">
                Area / Locality <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="edit-area"
                className={`input-field ${fieldErrors['area'] ? 'input-field-error' : ''}`}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              />
              {fieldErrors['area'] && <span className="field-error-text">{fieldErrors['area']}</span>}
            </div>

            {/* Landmark */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-landmark">Landmark</label>
              <input
                id="edit-landmark"
                className="input-field"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Nearby recognizable landmark"
              />
            </div>

            {/* City */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-city">City</label>
              <input
                id="edit-city"
                className="input-field"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            {/* PIN Code */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-pincode">
                PIN Code <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="edit-pincode"
                className={`input-field ${fieldErrors['pincode'] ? 'input-field-error' : ''}`}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value);
                  if (fieldErrors['pincode']) setFieldErrors((prev) => ({ ...prev, pincode: '' }));
                }}
                placeholder="6-digit PIN code (e.g. 422001)"
                maxLength={6}
                required
              />
              {fieldErrors['pincode'] && <span className="field-error-text">{fieldErrors['pincode']}</span>}
            </div>

            {/* Latitude */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-lat">GPS Latitude (-90 to 90)</label>
              <input
                id="edit-lat"
                className={`input-field ${fieldErrors['latitude'] ? 'input-field-error' : ''}`}
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  if (fieldErrors['latitude']) setFieldErrors((prev) => ({ ...prev, latitude: '' }));
                }}
                placeholder="e.g. 19.997453"
              />
              {fieldErrors['latitude'] && <span className="field-error-text">{fieldErrors['latitude']}</span>}
            </div>

            {/* Longitude */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-lng">GPS Longitude (-180 to 180)</label>
              <input
                id="edit-lng"
                className={`input-field ${fieldErrors['longitude'] ? 'input-field-error' : ''}`}
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  if (fieldErrors['longitude']) setFieldErrors((prev) => ({ ...prev, longitude: '' }));
                }}
                placeholder="e.g. 73.789802"
              />
              {fieldErrors['longitude'] && <span className="field-error-text">{fieldErrors['longitude']}</span>}
            </div>

            {/* Payment Terms */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-payment-terms">Payment Terms</label>
              <select
                id="edit-payment-terms"
                className="input-field"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
              >
                <option value="Advance Payment">Advance Payment</option>
                <option value="Credit Allowed">Credit Allowed</option>
              </select>
            </div>

            {/* Credit Limit */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-credit-limit">Credit Limit (₹)</label>
              <input
                id="edit-credit-limit"
                className={`input-field ${fieldErrors['creditLimit'] ? 'input-field-error' : ''}`}
                type="number"
                min="0"
                step="1000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
              {fieldErrors['creditLimit'] && <span className="field-error-text">{fieldErrors['creditLimit']}</span>}
            </div>

            {/* Delivery Window */}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="edit-window">Preferred Delivery Window</label>
              <input
                id="edit-window"
                className="input-field"
                value={deliveryWindow}
                onChange={(e) => setDeliveryWindow(e.target.value)}
                placeholder="e.g. 05:00 AM - 08:00 AM"
              />
            </div>

            {/* GSTIN */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-gstin">GSTIN (Optional)</label>
              <input
                id="edit-gstin"
                className={`input-field ${fieldErrors['gstin'] ? 'input-field-error' : ''}`}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AAAAA0000A1Z5"
              />
              {fieldErrors['gstin'] && <span className="field-error-text">{fieldErrors['gstin']}</span>}
            </div>

            {/* Internal Notes */}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="edit-notes">Internal Logistics Notes</label>
              <textarea
                id="edit-notes"
                className="input-field"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special delivery notes or gate access instructions..."
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #D6D3C8',
              paddingTop: '16px',
              marginTop: '8px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '130px' }}
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EditShopModal;

