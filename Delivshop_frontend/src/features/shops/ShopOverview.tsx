import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const ShopOverview: React.FC = () => {
  const sampleShops = [
    {
      id: 'shop_01',
      name: 'Downtown Fresh Grocery',
      address: '124 Market St, Metropolis',
      ordersCount: 42,
      status: 'OPEN',
      rating: 4.8,
    },
    {
      id: 'shop_02',
      name: 'Metro Artisan Bakery',
      address: '88 Baker Ave, Metropolis',
      ordersCount: 19,
      status: 'OPEN',
      rating: 4.9,
    },
    {
      id: 'shop_03',
      name: 'Green Leaf Organics',
      address: '312 Orchard Blvd, Metropolis',
      ordersCount: 31,
      status: 'CLOSED',
      rating: 4.7,
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Shops Directory</h2>
          <p className="page-desc">Registered merchant stores and real-time status</p>
        </div>
      </div>

      <Card title="Affiliated Merchants" subtitle="Data retrieved through GET /api/shops">
        <table className="data-table">
          <thead>
            <tr>
              <th>Store Name</th>
              <th>Location</th>
              <th>Rating</th>
              <th>Today Orders</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sampleShops.map((shop) => (
              <tr key={shop.id}>
                <td className="font-semibold">{shop.name}</td>
                <td>{shop.address}</td>
                <td>⭐ {shop.rating}</td>
                <td>{shop.ordersCount}</td>
                <td>
                  <Badge variant={shop.status === 'OPEN' ? 'success' : 'default'}>
                    {shop.status}
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
