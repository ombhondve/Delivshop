import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const DeliveriesTracking: React.FC = () => {
  const deliveries = [
    {
      id: 'del_301',
      orderNumber: 'DS-2026-101',
      driver: 'Alex Rivera',
      shop: 'Downtown Fresh Grocery',
      destination: '742 Evergreen Terrace',
      status: 'EN_ROUTE_DROPOFF',
      eta: '12 mins',
    },
    {
      id: 'del_302',
      orderNumber: 'DS-2026-102',
      driver: 'Unassigned',
      shop: 'Metro Artisan Bakery',
      destination: '104 Beacon Hill',
      status: 'PENDING_ASSIGNMENT',
      eta: 'Pending driver',
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Delivery Fleet Dispatch</h2>
          <p className="page-desc">Real-time driver location updates and dropoff status</p>
        </div>
      </div>

      <Card title="Dispatch Tracking" subtitle="Protected by driver assignment checks">
        <table className="data-table">
          <thead>
            <tr>
              <th>Delivery ID</th>
              <th>Order #</th>
              <th>Assigned Driver</th>
              <th>Pickup Merchant</th>
              <th>Dropoff Address</th>
              <th>ETA</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td><code>{d.id}</code></td>
                <td>{d.orderNumber}</td>
                <td>{d.driver}</td>
                <td>{d.shop}</td>
                <td>{d.destination}</td>
                <td>{d.eta}</td>
                <td>
                  <Badge variant={d.status === 'EN_ROUTE_DROPOFF' ? 'info' : 'warning'}>
                    {d.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
