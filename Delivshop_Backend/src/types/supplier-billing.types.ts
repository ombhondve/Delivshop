export type PickupStatus =
  | 'PENDING'
  | 'ARRIVED'
  | 'COLLECTED'
  | 'SHORTAGE'
  | 'SKIPPED'
  | 'AWAITING_SCHEDULING'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_COLLECTED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'CANCELLED';

export type BillStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';
export type BillPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type PaymentMethod = 'BANK_TRANSFER' | 'NEFT' | 'RTGS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER';

export interface PickupRecordItem {
  id: string;
  pickupId: string;
  productId: string;
  productName: string;
  productSku: string;
  category?: string;
  unit: string;
  requiredQuantity: number;
  collectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  shortageQuantity: number;
  supplierPurchasePrice: number;
  taxRate: number;
  lineTotal: number;
  shortageReason?: string | null;
  verificationRemarks?: string | null;
  isBilled: boolean;
  billItemId?: string | null;
}

export interface PickupRecord {
  id: string;
  pickupReference: string;
  runId?: string | null;
  runCode?: string | null;
  routeId?: string | null;
  routeName?: string | null;
  companyId: string;
  companyName: string;
  companyCode: string;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleRegistration?: string | null;
  stopSequence: number;
  status: PickupStatus;
  scheduledDate?: string | null;
  scheduledTimeWindow?: string | null;
  arrivalTime?: string | null;
  completedTime?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  verificationNotes?: string | null;
  discrepancyReason?: string | null;
  notes?: string | null;
  isBilled: boolean;
  billId?: string | null;
  billNumber?: string | null;
  totalRequiredUnits: number;
  totalCollectedUnits: number;
  totalAcceptedUnits: number;
  totalRejectedUnits: number;
  items: PickupRecordItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierBillItem {
  id: string;
  billId: string;
  pickupId?: string | null;
  pickupItemId?: string | null;
  pickupReference?: string | null;
  pickupDate?: string | null;
  productId: string;
  productName: string;
  productSku: string;
  category?: string | null;
  unit: string;
  requiredQuantity: number;
  collectedQuantity: number;
  acceptedQuantity: number; // Billable quantity used in payable math
  rejectedQuantity: number;
  shortageQuantity: number;
  unitPrice: number; // Agreed supplier purchase price
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  lineTotal: number;
  notes?: string | null;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  paymentNumber: string;
  billId: string;
  billNumber?: string;
  companyId: string;
  companyName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  recordedBy?: string | null;
  recordedByName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface SupplierBill {
  id: string;
  billNumber: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  companyAddress?: string;
  companyContactPerson?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGstin?: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billDate: string;
  dueDate: string;
  status: BillStatus;
  paymentStatus: BillPaymentStatus;
  subtotalAmount: number;
  taxAmount: number;
  adjustmentsAmount: number;
  adjustmentReason?: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  currency: string;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: SupplierBillItem[];
  payments: SupplierPayment[];
  pickupReferences: string[];
}

export interface SupplierFinancialSummary {
  companyId: string;
  totalFinalizedPayable: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  totalBillsCount: number;
  unpaidBillsCount: number;
  totalPickupsCount: number;
  verifiedPickupsCount: number;
  unbilledPickupsCount: number;
}
