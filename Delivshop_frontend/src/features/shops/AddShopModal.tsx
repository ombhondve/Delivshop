import React, { useState } from 'react';
import {
  X,
  MapPin,
  Link as LinkIcon,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { ProvisionedShopResponse, ShopType, PaymentTerms } from '../../types';
import { InteractiveMapPicker } from './InteractiveMapPicker';

interface AddShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShopCreated: () => void;
}

export const AddShopModal: React.FC<AddShopModalProps> = ({
  isOpen,
  onClose,
  onShopCreated,
}) => {
  // Section A: Shop Information
  const [name, setName] = useState('');
  const [shopType, setShopType] = useState<ShopType>('Retail Shop');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Section B: Shop Address
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Nashik');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');

  // Section C: GPS Location Mode
  const [locationMode, setLocationMode] = useState<'coordinates' | 'map_link' | 'picker'>('coordinates');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [mapLink, setMapLink] = useState('');
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [linkResolutionError, setLinkResolutionError] = useState<string | null>(null);

  // Section D: Delivery Information
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryWindow, setDeliveryWindow] = useState('');

  // Section E: Billing and Payment
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('Advance Payment');
  const [creditLimit, setCreditLimit] = useState('0');
  const [notes, setNotes] = useState('');

  // Status & Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [provisionedData, setProvisionedData] = useState<ProvisionedShopResponse | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Shop name is required';
    if (!ownerName.trim()) errs.ownerName = 'Owner name is required';
    if (!phone.trim()) {
      errs.phone = 'Mobile number is required';
    } else if (!/^[+]?[0-9\s-]{10,15}$/.test(phone.trim())) {
      errs.phone = 'Enter a valid 10-digit mobile number';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address';
    }

    if (!address.trim()) errs.address = 'Full address is required';
    if (!area.trim()) errs.area = 'Area / Locality is required';
    if (!city.trim()) errs.city = 'City is required';
    if (!state.trim()) errs.state = 'State is required';

    if (!pincode.trim()) {
      errs.pincode = 'PIN Code is required';
    } else if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      errs.pincode = 'PIN Code must be a valid 6-digit Indian postal code';
    }

    // Coordinate validation if provided
    const latNum = latitude ? parseFloat(latitude) : null;
    const lngNum = longitude ? parseFloat(longitude) : null;

    if ((latNum !== null && lngNum === null) || (latNum === null && lngNum !== null)) {
      errs.coordinates = 'Both Latitude and Longitude must be supplied together';
    } else if (latNum !== null && lngNum !== null) {
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errs.coordinates = 'Latitude must be between -90 and 90';
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errs.coordinates = 'Longitude must be between -180 and 180';
      }
    }

    if (gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase())) {
      errs.gstin = 'Invalid GSTIN format (e.g., 27AAAAA0000A1Z5)';
    }

    const creditNum = parseFloat(creditLimit);
    if (isNaN(creditNum) || creditNum < 0) {
      errs.creditLimit = 'Credit limit must be a positive number';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleResolveLink = async () => {
    if (!mapLink.trim()) {
      setLinkResolutionError('Please enter a Google Maps URL first.');
      return;
    }
    setIsResolvingLink(true);
    setLinkResolutionError(null);

    try {
      const resolved = await api.shops.resolveMapLink(mapLink.trim());
      setLatitude(String(resolved.latitude));
      setLongitude(String(resolved.longitude));
    } catch (err: any) {
      setLinkResolutionError(err.message || 'Failed to extract coordinates from map link.');
    } finally {
      setIsResolvingLink(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const lat = latitude ? parseFloat(latitude) : undefined;
      const lng = longitude ? parseFloat(longitude) : undefined;

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
        latitude: lat,
        longitude: lng,
        mapLink: mapLink.trim() || undefined,
        deliveryContactName: deliveryContactName.trim() || undefined,
        deliveryContactPhone: deliveryContactPhone.trim() || undefined,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        deliveryWindow: deliveryWindow.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        paymentTerms,
        creditLimit: parseFloat(creditLimit) || 0,
        notes: notes.trim() || undefined,
        status: 'ACTIVE',
      };

      const result = await api.shops.create(payload);
      setProvisionedData(result);
      onShopCreated();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to register shop. Please check the entered data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (provisionedData?.credentials.temporaryPassword) {
      navigator.clipboard.writeText(provisionedData.credentials.temporaryPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2500);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
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
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {provisionedData ? 'Shop Successfully Registered' : 'Add New Shop'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {provisionedData
                ? 'Store ID generated & initial login credentials provisioned.'
                : 'Register a merchant store with delivery GPS location and payment terms.'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {provisionedData ? (
            /* Single-Reveal Credentials Success Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
              >
                <CheckCircle2 color="var(--color-success)" size={28} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ color: '#34D399', fontWeight: 700, fontSize: '16px' }}>
                    {provisionedData.shop.name} is now provisioned!
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                    The shop record has been persisted in PostgreSQL with atomic sequence registration.
                  </p>
                </div>
              </div>

              {/* Generated Shop ID Box */}
              <div
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Official Shop ID (YYYYMMDDNNN)
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#60A5FA', fontFamily: 'monospace', marginTop: '4px' }}>
                    {provisionedData.credentials.shopId}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success">ACTIVE</span>
                </div>
              </div>

              {/* Single-Reveal Temporary Password Card */}
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                  <ShieldAlert size={18} />
                  Single-Reveal Temporary Login Password
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  This password is hashed with <strong>Argon2id</strong>. For security, it will <strong>never be shown again</strong>. Share it with the shop owner over an authorized channel. The owner must change it immediately on mobile first login.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#0F172A',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #334155',
                      fontFamily: 'monospace',
                      fontSize: '18px',
                      letterSpacing: '0.05em',
                      color: '#F8FAFC',
                      userSelect: 'all',
                    }}
                  >
                    {provisionedData.credentials.temporaryPassword}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="btn btn-primary"
                    style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {copiedPassword ? <Check size={16} /> : <Copy size={16} />}
                    {copiedPassword ? 'Copied' : 'Copy Password'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={onClose} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  Done & View in Directory
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {submitError && (
                <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={18} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Section A: Shop Information */}
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '14px' }}>
                  A. Shop Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Shop Name *</label>
                    <input
                      className={`input-field ${errors.name ? 'input-error' : ''}`}
                      placeholder="e.g. Nashik Agromart"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    {errors.name && <span className="input-error-text">{errors.name}</span>}
                  </div>

                  <div className="input-group">
                    <label className="input-label">Shop Type *</label>
                    <select
                      className="input-field"
                      value={shopType}
                      onChange={(e) => setShopType(e.target.value as ShopType)}
                    >
                      <option value="Retail Shop">Retail Shop</option>
                      <option value="Wholesale Shop">Wholesale Shop</option>
                      <option value="Distributor">Distributor</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Owner Name *</label>
                    <input
                      className={`input-field ${errors.ownerName ? 'input-error' : ''}`}
                      placeholder="e.g. Ramesh Patil"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                    {errors.ownerName && <span className="input-error-text">{errors.ownerName}</span>}
                  </div>

                  <div className="input-group">
                    <label className="input-label">Mobile Number *</label>
                    <input
                      className={`input-field ${errors.phone ? 'input-error' : ''}`}
                      placeholder="e.g. 9822012345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    {errors.phone && <span className="input-error-text">{errors.phone}</span>}
                  </div>

                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Email Address (Optional)</label>
                    <input
                      className={`input-field ${errors.email ? 'input-error' : ''}`}
                      placeholder="owner@store.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {errors.email && <span className="input-error-text">{errors.email}</span>}
                  </div>
                </div>
              </div>

              {/* Section B: Shop Address */}
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '14px' }}>
                  B. Shop Address
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Full Street Address *</label>
                    <input
                      className={`input-field ${errors.address ? 'input-error' : ''}`}
                      placeholder="Shop No. 4, Ground Floor, Sai Plaza"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    {errors.address && <span className="input-error-text">{errors.address}</span>}
                  </div>

                  <div className="input-group">
                    <label className="input-label">Area / Locality *</label>
                    <input
                      className={`input-field ${errors.area ? 'input-error' : ''}`}
                      placeholder="e.g. Panchavati or College Road"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                    {errors.area && <span className="input-error-text">{errors.area}</span>}
                  </div>

                  <div className="input-group">
                    <label className="input-label">Landmark (Optional)</label>
                    <input
                      className="input-field"
                      placeholder="Near Ram Mandir"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">City *</label>
                    <input
                      className="input-field"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">State *</label>
                    <input
                      className="input-field"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">PIN Code (6 Digits) *</label>
                    <input
                      className={`input-field ${errors.pincode ? 'input-error' : ''}`}
                      placeholder="422003"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                    {errors.pincode && <span className="input-error-text">{errors.pincode}</span>}
                  </div>
                </div>
              </div>

              {/* Section C: Shop GPS Location */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    C. Shop Delivery GPS Location
                  </h4>
                  <span className={`badge ${latitude && longitude ? 'badge-success' : 'badge-default'}`}>
                    {latitude && longitude ? 'Verified Coordinates' : 'Location Unverified'}
                  </span>
                </div>

                {/* 3 Mutually Exclusive Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setLocationMode('coordinates')}
                    className={`btn btn-sm ${locationMode === 'coordinates' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ gap: '6px' }}
                  >
                    <Navigation size={14} /> 1. Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('map_link')}
                    className={`btn btn-sm ${locationMode === 'map_link' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ gap: '6px' }}
                  >
                    <LinkIcon size={14} /> 2. Google Maps Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('picker')}
                    className={`btn btn-sm ${locationMode === 'picker' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ gap: '6px' }}
                  >
                    <MapPin size={14} /> 3. Pick on Map
                  </button>
                </div>

                {errors.coordinates && (
                  <div className="alert-error" style={{ marginBottom: '12px' }}>
                    {errors.coordinates}
                  </div>
                )}

                {/* Mode 1: Direct Coordinates */}
                {locationMode === 'coordinates' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Latitude (-90 to 90)</label>
                      <input
                        className="input-field"
                        placeholder="e.g. 20.005882"
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Longitude (-180 to 180)</label>
                      <input
                        className="input-field"
                        placeholder="e.g. 73.789764"
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Mode 2: Google Maps Link */}
                {locationMode === 'map_link' && (
                  <div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        className="input-field"
                        style={{ flex: 1 }}
                        placeholder="Paste Google Maps URL (e.g. https://maps.google.com/?q=20.005882,73.789764)"
                        value={mapLink}
                        onChange={(e) => setMapLink(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleResolveLink}
                        disabled={isResolvingLink}
                        className="btn btn-outline"
                        style={{ gap: '6px', whiteSpace: 'nowrap' }}
                      >
                        {isResolvingLink ? <Loader2 className="animate-spin" size={16} /> : <Navigation size={16} />}
                        Resolve Coordinates
                      </button>
                    </div>
                    {linkResolutionError && (
                      <span className="input-error-text" style={{ display: 'block', marginTop: '6px' }}>
                        {linkResolutionError}
                      </span>
                    )}
                    {latitude && longitude && (
                      <div style={{ marginTop: '10px', fontSize: '13px', color: '#34D399' }}>
                        ✓ Extracted Coordinates: {latitude}, {longitude}
                      </div>
                    )}
                  </div>
                )}

                {/* Mode 3: Visual Pin Picker */}
                {locationMode === 'picker' && (
                  <InteractiveMapPicker
                    latitude={latitude ? parseFloat(latitude) : null}
                    longitude={longitude ? parseFloat(longitude) : null}
                    onChange={(lat, lng) => {
                      setLatitude(String(lat));
                      setLongitude(String(lng));
                    }}
                  />
                )}
              </div>

              {/* Section D: Delivery Information */}
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '14px' }}>
                  D. Delivery Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Delivery Contact Person</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Store Manager Suresh"
                      value={deliveryContactName}
                      onChange={(e) => setDeliveryContactName(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Alternate Delivery Phone</label>
                    <input
                      className="input-field"
                      placeholder="e.g. 9822099999"
                      value={deliveryContactPhone}
                      onChange={(e) => setDeliveryContactPhone(e.target.value)}
                    />
                  </div>

                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Preferred Delivery Window / Hours</label>
                    <input
                      className="input-field"
                      placeholder="e.g. 9:00 AM - 1:00 PM or Early Morning"
                      value={deliveryWindow}
                      onChange={(e) => setDeliveryWindow(e.target.value)}
                    />
                  </div>

                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Delivery Entrance Instructions</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Enter through the rear loading dock, call before arriving..."
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section E: Billing and Payment */}
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '14px' }}>
                  E. Billing and Payment
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Payment Terms *</label>
                    <select
                      className="input-field"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                    >
                      <option value="Advance Payment">Advance Payment</option>
                      <option value="Credit Allowed">Credit Allowed</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Credit Limit (₹)</label>
                    <input
                      className={`input-field ${errors.creditLimit ? 'input-error' : ''}`}
                      type="number"
                      min="0"
                      step="1000"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                    />
                    {errors.creditLimit && <span className="input-error-text">{errors.creditLimit}</span>}
                  </div>

                  <div className="input-group">
                    <label className="input-label">GSTIN (Optional)</label>
                    <input
                      className={`input-field ${errors.gstin ? 'input-error' : ''}`}
                      placeholder="27AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    />
                    {errors.gstin && <span className="input-error-text">{errors.gstin}</span>}
                  </div>

                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Billing Address (If different from store)</label>
                    <input
                      className="input-field"
                      placeholder="Registered business address..."
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                    />
                  </div>

                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Internal Supplier Notes</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Special discount agreements, trusted merchant..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '10px 24px' }}>
                  {isSubmitting ? 'Provisioning Shop Account...' : 'Save & Provision Shop'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
