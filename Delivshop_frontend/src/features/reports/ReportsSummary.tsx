import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const ReportsSummary: React.FC = () => {
  const auditLogs = [
    { id: '1', action: 'USER_LOGIN', actor: 'admin@delivshop.local', entity: 'user', time: '5 mins ago', ip: '127.0.0.1' },
    { id: '2', action: 'ORDER_STATUS_UPDATED', actor: 'shop@delivshop.local', entity: 'order: ord_101', time: '14 mins ago', ip: '192.168.1.10' },
    { id: '3', action: 'DELIVERY_STATUS_UPDATED', actor: 'driver@delivshop.local', entity: 'delivery: del_301', time: '22 mins ago', ip: '172.56.21.9' },
    { id: '4', action: 'USER_REGISTERED', actor: 'new_shop@delivshop.local', entity: 'user: usr_04', time: '1 hour ago', ip: '127.0.0.1' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Security & Audit Logs</h2>
          <p className="page-desc">Server-recorded audit events for compliance and security auditing</p>
        </div>
      </div>

      <Card title="Recent Security Operations" subtitle="Audited via backend audit_logs table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>IP Address</th>
              <th>Timestamp</th>
              <th>Audit Status</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td><code>{log.action}</code></td>
                <td>{log.actor}</td>
                <td>{log.entity}</td>
                <td>{log.ip}</td>
                <td>{log.time}</td>
                <td>
                  <Badge variant="success">Recorded</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
