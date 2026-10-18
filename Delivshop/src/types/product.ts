export interface Product {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  sku: string;
  price: number;
  stockQuantity?: number;
  stock_quantity?: number;
  unit?: string;
  unit_of_measure?: string;
  pack_size?: string;
  packSize?: string;
  category: string;
  isActive?: boolean;
  is_active?: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}
