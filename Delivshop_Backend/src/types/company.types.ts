export type CompanyType =
  | 'Dairy Processor'
  | 'Milk Producer Cooperative'
  | 'Wholesale Dairy Supplier'
  | 'Packaging & Feed Supplier'
  | 'Logistics Partner'
  | 'Other';

export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export interface CompanyRecord {
  id: string;
  company_code: string;
  name: string;
  company_type: CompanyType;
  description?: string | null;
  logo_url?: string | null;
  contact_person: string;
  phone: string;
  email: string;
  alt_phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  registration_number?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  status: CompanyStatus;
  notes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Company {
  id: string;
  companyCode: string;
  name: string;
  companyType: CompanyType;
  description?: string | null;
  logoUrl?: string | null;
  contactPerson: string;
  phone: string;
  email: string;
  altPhone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  registrationNumber?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  status: CompanyStatus;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  productsCount?: number;
}

export interface CreateCompanyInput {
  name: string;
  companyCode?: string | null;
  companyType?: CompanyType;
  description?: string | null;
  logoUrl?: string | null;
  contactPerson: string;
  phone: string;
  email: string;
  altPhone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  registrationNumber?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  status?: CompanyStatus;
}

export interface UpdateCompanyInput {
  name?: string;
  companyType?: CompanyType;
  description?: string | null;
  logoUrl?: string | null;
  contactPerson?: string;
  phone?: string;
  email?: string;
  altPhone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  registrationNumber?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  status?: CompanyStatus;
}

export interface CompanyFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CompanyStatus;
  companyType?: CompanyType;
  city?: string;
  sortBy?: 'created_at' | 'name' | 'company_code' | 'city' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CompanySummaryStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  recentCompanies: number; // created within last 30 days
}
