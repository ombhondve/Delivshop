import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const metrics = [
    { title: 'Total Registered Shops', value: '48', trend: '+12% this month', icon: '🏪' },
    { title: 'Active Deliveries', value: '16', trend: '4 en route', icon: '🚚' },
    { title: 'Today’s Gross Volume', value: '$18,450', trend: '+8.4%', icon: '💳' },
    { title: 'API Gateway Health', value: 'Operational', trend: 'Avg latency: 12ms', icon: '⚡' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Operations Dashboard</h2>
          <p className="page-desc">System health, fleet tracking, and order dispatch overview</p>
        </div>
        <Badge variant="success">API Connected</Badge>
      </div>

      <div className="metrics-grid">
        {metrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-icon">{m.icon}</div>
            <div className="metric-info">
              <span className="metric-title">{m.title}</span>
              <span className="metric-value">{m.value}</span>
              <span className="metric-trend">{m.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card title="Architecture Guardrails" subtitle="System boundaries & security enforcement">
          <ul className="info-list">
            <li>
              <strong>Mobile App Isolation:</strong> Communicates exclusively via HTTP APIs. No local DB connections.
            </li>
            <li>
              <strong>Web Frontend Isolation:</strong> Uses client API services only with Bearer tokens.
            </li>
            <li>
              <strong>Backend Authority:</strong> Parameterized queries in PostgreSQL with server-side role validation.
            </li>
            <li>
              <strong>Security Policy:</strong> Strict CORS allowlisting and rate-limited auth endpoints.
            </li>
          </ul>
        </Card>

        <Card title="Quick API Connectivity" subtitle="Runtime integration status">
          <div className="status-row">
            <span>Backend API Base URL</span>
            <code>{import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}</code>
          </div>
          <div className="status-row">
            <span>Direct Database Access</span>
            <Badge variant="danger">Blocked (By Architecture)</Badge>
          </div>
          <div className="status-row">
            <span>Authorization Enforcement</span>
            <Badge variant="success">Server-Side Strict</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
};
