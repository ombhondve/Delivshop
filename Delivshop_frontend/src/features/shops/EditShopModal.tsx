import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { api } from '../../services/api/endpoints';
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

  const [name, setName] = useState(shop.name);
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

  const [latitude, setLatitude] = useState(shop.latitude ? String(shop.latitude) : '');
  const [longitude, setLongitude] = useState(shop.longitude ? String(shop.longitude) : '');

  const [deliveryContactName, setDeliveryContactName] = useState(shop.delivery_contact_name || '');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState(shop.delivery_contact_phone || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState(shop.delivery_instructions || '');
  const [deliveryWindow, setDeliveryWindow] = useState(shop.delivery_window || '');

  const [gstin, setGstin] = useState(shop.gstin || '');
  const [billingAddress, setBillingAddress] = useState(shop.billing_address || '');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(shop.payment_terms || 'Advance Payment');
  const [creditLimit, setCreditLimit] = useState(String(shop.credit_limit || 0));
  const [notes, setNotes] = useState(shop.notes || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const latNum = latitude.trim() ? parseFloat(latitude) : null;
      const lngNum = longitude.trim() ? parseFloat(longitude) : null;

      if ((latNum !== null && lngNum === null) || (latNum === null && lngNum !== null)) {
        throw new Error('Both Latitude and Longitude must be provided together');
      }

      const payload = {
        name: name.trim(),
        shopType,
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        area: area.trim(),
        landmark: landmark.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude: latNum,
        longitude: lngNum,
        deliveryContactName: deliveryContactName.trim() || null,
        deliveryContactPhone: deliveryContactPhone.trim() || null,
        deliveryInstructions: deliveryInstructions.trim() || null,
        deliveryWindow: deliveryWindow.trim() || null,
        gstin: gstin.trim().toUpperCase() || null,
        billingAddress: billingAddress.trim() || null,
        paymentTerms,
        creditLimit: parseFloat(creditLimit) || 0,
        notes: notes.trim() || null,
      };

      await api.shops.update(shop.id, payload);
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update shop details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Edit Shop: {shop.name}
            </h3>
            <div style={{ fontSize: '12px', color: '#60A5FA', fontFamily: 'monospace' }}>
              Shop ID: {shop.shop_id}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="input-group">
              <label className="input-label">Shop Name</label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label">Shop Type</label>
              <select className="input-field" value={shopType} onChange={(e) => setShopType(e.target.value as ShopType)}>
                <option value="Retail Shop">Retail Shop</option>
                <option value="Wholesale Shop">Wholesale Shop</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Owner Name</label>
              <input className="input-field" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Street Address</label>
              <input className="input-field" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label">Area / Locality</label>
              <input className="input-field" value={area} onChange={(e) => setArea(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label">PIN Code</label>
              <input className="input-field" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label">Latitude</label>
              <input className="input-field" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Longitude</label>
              <input className="input-field" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Payment Terms</label>
              <select className="input-field" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}>
                <option value="Advance Payment">Advance Payment</option>
                <option value="Credit Allowed">Credit Allowed</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Credit Limit (₹)</label>
              <input className="input-field" type="number" min="0" step="1000" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Preferred Delivery Window</label>
              <input className="input-field" value={deliveryWindow} onChange={(e) => setDeliveryWindow(e.target.value)} />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Internal Notes</label>
              <textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '8px 20px' }}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
