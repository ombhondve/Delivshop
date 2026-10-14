import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const OrdersList: React.FC = () => {
  const sampleOrders = [
    {
      id: 'ord_101',
      orderNumber: 'DS-2026-101',
      shopName: 'Downtown Fresh Grocery',
      status: 'IN_TRANSIT',
      total: 15.98,
      itemsCount: 2,
      createdAt: '2026-03-10T14:20:00Z',
    },
    {
      id: 'ord_102',
      orderNumber: 'DS-2026-102',
      shopName: 'Metro Artisan Bakery',
      status: 'PREPARING',
      total: 24.50,
      itemsCount: 3,
      createdAt: '2026-03-10T14:40:00Z',
    },
    {
      id: 'ord_103',
      orderNumber: 'DS-2026-103',
      shopName: 'Green Leaf Organics',
      status: 'DELIVERED',
      total: 38.20,
      itemsCount: 5,
      createdAt: '2026-03-10T13:10:00Z',
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Order Processing</h2>
          <p className="page-desc">Order verification, lifecycle status, and shop assignments</p>
        </div>
      </div>

      <Card title="Live Orders Feed" subtitle="Scoped per shop with strict server-side resource checks">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Shop Origin</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Timestamp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sampleOrders.map((ord) => (
              <tr key={ord.id}>
                <td><code>{ord.orderNumber}</code></td>
                <td>{ord.shopName}</td>
                <td>{ord.itemsCount} items</td>
                <td className="font-semibold">{formatCurrency(ord.total)}</td>
                <td>{formatDate(ord.createdAt)}</td>
                <td>
                  <Badge
                    variant={
                      ord.status === 'DELIVERED'
                        ? 'success'
                        : ord.status === 'IN_TRANSIT'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {ord.status}
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
