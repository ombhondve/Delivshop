import React, { useState } from 'react';
import {
  Package,
  Search,
  ListFilter,
  Plus,
  Milk,
  Boxes,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/formatters';

interface DairyProduct {
  id: string;
  sku: string;
  name: string;
  category: 'Fresh Milk' | 'Cultured Dairy' | 'Ghee & Butter' | 'Paneer & Cheese';
  packSize: string;
  crateUnits: number;
  price: number;
  stockCrates: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export const ProductCatalog: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const products: DairyProduct[] = [
    {
      id: 'prod_1',
      sku: 'MLK-FCM-1L',
      name: 'Full Cream Milk (6.0% Fat / 9.0% SNF)',
      category: 'Fresh Milk',
      packSize: '1000 ml Pouch',
      crateUnits: 12,
      price: 68.0,
      stockCrates: 240,
      status: 'IN_STOCK',
    },
    {
      id: 'prod_2',
      sku: 'MLK-COW-500',
      name: 'Cow Fresh Milk (3.5% Fat / 8.5% SNF)',
      category: 'Fresh Milk',
      packSize: '500 ml Pouch',
      crateUnits: 24,
      price: 28.0,
      stockCrates: 420,
      status: 'IN_STOCK',
    },
    {
      id: 'prod_3',
      sku: 'MLK-TON-500',
      name: 'Toned Homogenized Milk (3.0% Fat)',
      category: 'Fresh Milk',
      packSize: '500 ml Pouch',
      crateUnits: 24,
      price: 26.0,
      stockCrates: 180,
      status: 'IN_STOCK',
    },
    {
      id: 'prod_4',
      sku: 'MLK-BUF-1L',
      name: 'Premium Buffalo Milk (7.0% Fat)',
      category: 'Fresh Milk',
      packSize: '1000 ml Pouch',
      crateUnits: 12,
      price: 74.0,
      stockCrates: 35,
      status: 'LOW_STOCK',
    },
    {
      id: 'prod_5',
      sku: 'DAH-CURD-400',
      name: 'Set Dahi / Farm Fresh Curd',
      category: 'Cultured Dairy',
      packSize: '400 g Tub',
      crateUnits: 16,
      price: 45.0,
      stockCrates: 95,
      status: 'IN_STOCK',
    },
    {
      id: 'prod_6',
      sku: 'PAN-MAL-200',
      name: 'Malai Paneer (Vacuum Sealed)',
      category: 'Paneer & Cheese',
      packSize: '200 g Block',
      crateUnits: 20,
      price: 92.0,
      stockCrates: 14,
      status: 'LOW_STOCK',
    },
    {
      id: 'prod_7',
      sku: 'GHE-COW-500',
      name: 'Desi Cow Ghee (Granular Bilona)',
      category: 'Ghee & Butter',
      packSize: '500 ml Jar',
      crateUnits: 12,
      price: 380.0,
      stockCrates: 60,
      status: 'IN_STOCK',
    },
    {
      id: 'prod_8',
      sku: 'BTR-TBL-100',
      name: 'Table Butter Salted',
      category: 'Ghee & Butter',
      packSize: '100 g Foil',
      crateUnits: 40,
      price: 54.0,
      stockCrates: 0,
      status: 'OUT_OF_STOCK',
    },
  ];

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Products & Cold Inventory</h2>
          <p className="page-desc">
            Master SKU catalog for dairy pouches, bulk crates, wholesale pricing, and facility stock
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" icon={<Download size={15} />}>
            Export Price List
          </Button>
          <Button variant="primary" icon={<Plus size={16} />}>
            Add SKU Item
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <Milk size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active Dairy SKUs</span>
            <span className="metric-value">{products.length} Items</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>4 Categories</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Boxes size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Cold Storage Crates</span>
            <span className="metric-value">1,044 Crates</span>
            <span className="metric-trend" style={{ color: '#0369A1' }}>Ready for Dispatch</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <AlertCircle size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Low Stock Items</span>
            <span className="metric-value">2 Items</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>Below threshold</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="search-filter-toolbar">
        <div className="toolbar-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search by SKU code or product description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search dairy products"
            />
          </div>
        </div>

        <div className="toolbar-filters-group">
          <div className="filter-select-wrapper">
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by product category"
            >
              <option value="">All Categories</option>
              <option value="Fresh Milk">Fresh Milk</option>
              <option value="Cultured Dairy">Cultured Dairy</option>
              <option value="Ghee & Butter">Ghee & Butter</option>
              <option value="Paneer & Cheese">Paneer & Cheese</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <Card
        title="Master Product Registry"
        subtitle={`Showing ${filtered.length} products available for shop allocations`}
        noPadding
      >
        <div className="business-table-container">
          <table className="business-table">
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Product Description</th>
                <th>Category</th>
                <th>Unit Size</th>
                <th>Units / Crate</th>
                <th>Wholesale Rate</th>
                <th>Hub Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code style={{ fontWeight: 700, fontSize: '12px' }}>{p.sku}</code>
                  </td>
                  <td>
                    <div className="font-semibold text-primary">{p.name}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>{p.category}</span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#64748B' }}>{p.packSize}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {p.crateUnits} units/crate
                  </td>
                  <td className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(p.price)}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontWeight: 600 }}>{p.stockCrates}</span> crates
                  </td>
                  <td>
                    <Badge
                      variant={
                        p.status === 'IN_STOCK'
                          ? 'success'
                          : p.status === 'LOW_STOCK'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {p.status === 'IN_STOCK'
                        ? 'In Stock'
                        : p.status === 'LOW_STOCK'
                        ? 'Low Stock'
                        : 'Out of Stock'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
