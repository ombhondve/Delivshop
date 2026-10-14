export type ShopType = 'Retail Shop' | 'Wholesale Shop' | 'Distributor';
export type ShopStatus = 'ACTIVE' | 'INACTIVE';
export type PaymentTerms = 'Advance Payment' | 'Credit Allowed';

export interface ShopRecord {
  id: string;
  shop_id: string;
  name: string;
  shop_type: ShopType;
  owner_id: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  map_link?: string | null;
  is_location_verified: boolean;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
  delivery_instructions?: string | null;
  delivery_window?: string | null;
  gstin?: string | null;
  billing_address?: string | null;
  payment_terms: PaymentTerms;
  credit_limit: number;
  outstanding_balance: number;
  notes?: string | null;
  status: ShopStatus;
  is_open: boolean;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

export interface ShopAccountRecord {
  id: string;
  shop_id: string;
  user_id: string;
  must_change_password: boolean;
  temp_password_issued_at: Date;
  setup_token_hash?: string | null;
  setup_token_expires_at?: Date | null;
  failed_login_attempts: number;
  locked_until?: Date | null;
  last_login_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateShopInput {
  name: string;
  shopType: ShopType;
  ownerName: string;
  phone: string;
  email?: string;
  address: string;
  area: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  mapLink?: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  deliveryInstructions?: string;
  deliveryWindow?: string;
  gstin?: string;
  billingAddress?: string;
  paymentTerms: PaymentTerms;
  creditLimit?: number;
  notes?: string;
  status?: ShopStatus;
}

export interface UpdateShopInput {
  name?: string;
  shopType?: ShopType;
  ownerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapLink?: string | null;
  deliveryContactName?: string | null;
  deliveryContactPhone?: string | null;
  deliveryInstructions?: string | null;
  deliveryWindow?: string | null;
  gstin?: string | null;
  billingAddress?: string | null;
  paymentTerms?: PaymentTerms;
  creditLimit?: number;
  notes?: string | null;
  isOpen?: boolean;
}

export interface ShopFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  shopType?: ShopType;
  status?: ShopStatus;
  city?: string;
  sortBy?: 'created_at' | 'name' | 'shop_id' | 'outstanding_balance' | 'credit_limit';
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProvisionedShopResponse {
  shop: ShopRecord;
  credentials: {
    shopId: string;
    temporaryPassword: string; // Returned only once during provisioning
    loginUrlNotice: string;
    mustChangePassword: true;
  };
}
