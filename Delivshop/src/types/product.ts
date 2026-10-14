export interface Product {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  sku: string;
  price: number;
  stockQuantity?: number;
  stock_quantity?: number;
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
