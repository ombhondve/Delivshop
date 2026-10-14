import React, { useState } from 'react';
import {
  Building2,
  Clock,
  ShieldCheck,
  CreditCard,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const [hubName, setHubName] = useState('Delivshop Central Dairy Hub — Pune North');
  const [fssaiLicense, setFssaiLicense] = useState('11521034000892');
  const [morningCutoff, setMorningCutoff] = useState('03:30');
  const [eveningCutoff, setEveningCutoff] = useState('16:00');
  const [defaultCreditLimit, setDefaultCreditLimit] = useState('25000');
  const [paymentGraceDays, setPaymentGraceDays] = useState('3');
  const [dispatchContact, setDispatchContact] = useState('+91 98220 12345');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Operational Settings</h2>
          <p className="page-desc">
            Configure distribution hub parameters, milk dispatch schedules, credit policies, and architecture guardrails
          </p>
        </div>
        {savedSuccess && (
          <Badge variant="success" icon={<CheckCircle2 size={13} />}>
            Settings Saved Successfully
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Hub Information */}
        <Card
          title="Distribution Hub & Licensing"
          subtitle="Facility identification and regulatory compliance details"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Distribution Hub Name</label>
              <input
                type="text"
                className="input-field"
                value={hubName}
                onChange={(e) => setHubName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">FSSAI Dairy License Number</label>
              <input
                type="text"
                className="input-field"
                value={fssaiLicense}
                onChange={(e) => setFssaiLicense(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Master Dispatch Hot-line</label>
              <input
                type="text"
                className="input-field"
                value={dispatchContact}
                onChange={(e) => setDispatchContact(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Hub Base Area</label>
              <input
                type="text"
                className="input-field"
                defaultValue="Sector 4, Bhosari MIDC, Pune 411026"
                disabled
              />
            </div>
          </div>
        </Card>

        {/* Dispatch Scheduling & Cut-Offs */}
        <Card
          title="Milk Dispatch Timing & Route Cut-Offs"
          subtitle="Orders placed after cut-off are automatically queued for next delivery run"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Morning Shift Order Cut-Off Time</label>
              <div style={{ position: 'relative' }}>
                <Clock
                  size={15}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
                />
                <input
                  type="time"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  value={morningCutoff}
                  onChange={(e) => setMorningCutoff(e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Vehicles depart cold-storage at 04:30 AM
              </span>
            </div>

            <div className="input-group">
              <label className="input-label">Evening Shift Order Cut-Off Time</label>
              <div style={{ position: 'relative' }}>
                <Clock
                  size={15}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
                />
                <input
                  type="time"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  value={eveningCutoff}
                  onChange={(e) => setEveningCutoff(e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Vehicles depart cold-storage at 05:15 PM
              </span>
            </div>
          </div>
        </Card>

        {/* Credit & Terms */}
        <Card
          title="Merchant Credit & Billing Policies"
          subtitle="Defaults applied during new shop onboarding and automatic dispatch locks"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Default Shop Credit Limit (₹)</label>
              <input
                type="number"
                className="input-field"
                value={defaultCreditLimit}
                onChange={(e) => setDefaultCreditLimit(e.target.value)}
                required
              />
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Can be individually overridden in Shop Details
              </span>
            </div>

            <div className="input-group">
              <label className="input-label">Payment Grace Period (Days)</label>
              <input
                type="number"
                className="input-field"
                value={paymentGraceDays}
                onChange={(e) => setPaymentGraceDays(e.target.value)}
                required
              />
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Days before an unpaid invoice marks shop status OVERDUE
              </span>
            </div>
          </div>
        </Card>

        {/* System Architecture & Guardrails */}
        <Card
          title="Security Architecture Enforcement"
          subtitle="Strict validation layers guaranteeing zero direct DB exposure from frontend clients"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#20342C' }}>
                  Web Frontend Isolation
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                  Frontend communicates exclusively via REST APIs with Bearer token authentication
                </div>
              </div>
              <Badge variant="success">Enforced</Badge>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#20342C' }}>
                  Direct PostgreSQL Access
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                  Neon DB connections restricted to backend serverless runtime only
                </div>
              </div>
              <Badge variant="neutral">Architecturally Blocked</Badge>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#20342C' }}>
                  Session Security
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                  JWT signature verification with role-based access control (Admin / Driver / Shop)
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <Button type="submit" variant="primary" icon={<Save size={16} />}>
            Save Operational Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
