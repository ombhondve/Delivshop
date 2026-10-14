import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../utils/formatters';

export const ProductCatalog: React.FC = () => {
  const products = [
    { id: '1', name: 'Organic Hass Avocados (4pk)', sku: 'AVO-4PK', price: 5.99, stock: 45, category: 'Produce' },
    { id: '2', name: 'Artisan Sourdough Loaf', sku: 'BRD-SRD', price: 6.49, stock: 18, category: 'Bakery' },
    { id: '3', name: 'Almond Milk Unsweetened 1L', sku: 'MLK-ALM', price: 3.89, stock: 32, category: 'Dairy Alternatives' },
    { id: '4', name: 'Cold Pressed Orange Juice', sku: 'JCE-ORG', price: 4.99, stock: 24, category: 'Beverages' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Product Catalog</h2>
          <p className="page-desc">Master catalog managed across shops and suppliers</p>
        </div>
      </div>

      <Card title="Inventory Items" subtitle="Managed with stock validation and unique SKU constraints">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><code>{p.sku}</code></td>
                <td className="font-semibold">{p.name}</td>
                <td>{p.category}</td>
                <td>{formatCurrency(p.price)}</td>
                <td>{p.stock} units</td>
                <td>
                  <Badge variant={p.stock > 20 ? 'success' : 'warning'}>
                    {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
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
