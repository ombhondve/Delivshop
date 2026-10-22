export type ShiftStatus = 'NOT_STARTED' | 'ON_DUTY' | 'ON_BREAK' | 'COMPLETED';

export type DeliveryRunStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'ASSIGNED'
  | 'READY'
  | 'TO_PICKUP'
  | 'ARRIVED_PICKUP'
  | 'LOADING'
  | 'LOADED'
  | 'DELIVERY_READY'
  | 'IN_DELIVERY'
  | 'IN_PROGRESS'
  | 'RETURNING_HOME'
  | 'RECONCILIATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAUSED'
  | 'NEEDS_REVIEW';

export type StopStatus = 'PENDING' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'SKIPPED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';

export type IncidentCategory =
  | 'SHOP_CLOSED'
  | 'DELIVERY_REFUSED'
  | 'PARTIAL_DELIVERY'
  | 'DAMAGED_PRODUCTS'
  | 'MISSING_STOCK'
  | 'VEHICLE_BREAKDOWN'
  | 'ROUTE_OBSTRUCTION'
  | 'PAYMENT_DISCREPANCY'
  | 'SAFETY_INCIDENT'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DriverAttendance {
  id: string;
  driver_id: string;
  attendance_date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';
  is_late: boolean;
  notes?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
}

export interface AttendanceSummary {
  daysPresentMonth: number;
  daysLateMonth: number;
  daysAbsentMonth: number;
  totalWorkingDays: number;
  hoursWorkedToday?: number;
}

export interface AssignedVehicle {
  id: string;
  vehicle_code: string;
  registration_number: string;
  make_model: string;
  vehicle_type: string;
  capacity_kg: number;
  capacity_crates: number;
  fuel_type: string;
  is_refrigerated: boolean;
  city?: string;
  depot?: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'INACTIVE';
  current_odometer_km: number;
  notes?: string;
}

export interface DeliveryRunStop {
  id: string;
  run_id: string;
  shop_id: string;
  stop_sequence: number;
  status: StopStatus;
  arrival_time?: string | null;
  delivery_time?: string | null;
  delivered_crates_count?: number;
  returned_crates_count?: number;
  shortage_reason?: string | null;
  collected_amount?: number;
  payment_method?: PaymentMethod;
  notes?: string | null;
  proof_of_delivery_url?: string | null;
  failure_reason?: string | null;
  shop_name?: string;
  shop_address?: string;
  shop_area?: string;
  shop_city?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  is_location_verified?: boolean;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
  default_instructions?: string | null;
}

export interface DeliveryRun {
  id: string;
  run_code: string;
  route_id: string;
  driver_id: string;
  vehicle_id: string;
  delivery_date: string;
  status: DeliveryRunStatus;
  planned_stops_count: number;
  completed_stops_count: number;
  dispatch_time?: string | null;
  completion_time?: string | null;
  notes?: string | null;
  route_code?: string;
  route_name?: string;
  route_city?: string;
  route_depot?: string;
  total_distance_km?: number;
  estimated_duration_minutes?: number;
  driver_name?: string;
  driver_employee_id?: string;
  driver_phone?: string;
  vehicle_registration?: string;
  vehicle_code?: string;
  vehicle_type?: string;
  capacity_crates?: number;
  start_location_name?: string | null;
  start_latitude?: number | null;
  start_longitude?: number | null;
  start_address?: string | null;
  start_place_id?: string | null;
  return_location_name?: string | null;
  return_latitude?: number | null;
  return_longitude?: number | null;
  return_address?: string | null;
  return_place_id?: string | null;
  stops?: DeliveryRunStop[];
}

export interface DeliveryOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku?: string;
  category?: string;
  base_unit?: string;
  pack_size?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  delivered_quantity?: number;
  shortage_quantity?: number;
  shortage_reason?: string;
}

export interface CompleteDeliveryPayload {
  status: 'DELIVERED' | 'FAILED';
  recipientName?: string;
  recipientPhone?: string;
  deliveredCratesCount?: number;
  returnedCratesCount?: number;
  shortageReason?: string;
  collectedAmount?: number;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  proofOfDeliveryUrl?: string;
  signatureUrl?: string;
  latitude?: number;
  longitude?: number;
  itemDiscrepancies?: Array<{
    productId: string;
    orderedQuantity: number;
    deliveredQuantity: number;
    shortageReason?: string;
  }>;
}

export interface DeliveryCollection {
  id: string;
  receipt_number: string;
  run_id?: string;
  shop_id: string;
  driver_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
  status: 'COLLECTED' | 'RECONCILED' | 'DEPOSITED' | 'DISPUTED';
  collected_at: string;
  shop_name?: string;
  run_code?: string;
}

export interface CollectionSummary {
  totalCollected: number;
  cashCollected: number;
  upiCollected: number;
  chequeCollected: number;
  totalReceiptsCount: number;
  pendingReconciliationCount: number;
}

export interface VehicleInspectionPayload {
  vehicleId: string;
  runId?: string;
  odometerKm: number;
  fuelLevelPercent?: number;
  refrigerationTempC?: number;
  isTyresOk: boolean;
  isLightsOk: boolean;
  isBodyOk: boolean;
  isRefrigerationOk: boolean;
  isSafetyKitOk: boolean;
  isDocsValid: boolean;
  passed: boolean;
  defectsReported?: string;
  photoUrl?: string;
}

export interface VehicleInspection {
  id: string;
  inspection_code: string;
  vehicle_id: string;
  driver_id: string;
  run_id?: string;
  odometer_km: number;
  fuel_level_percent?: number;
  refrigeration_temp_c?: number;
  is_tyres_ok: boolean;
  is_lights_ok: boolean;
  is_body_ok: boolean;
  is_refrigeration_ok: boolean;
  is_safety_kit_ok: boolean;
  is_docs_valid: boolean;
  passed: boolean;
  defects_reported?: string;
  photo_url?: string;
  created_at: string;
  registration_number?: string;
  make_model?: string;
}

export interface DriverIncident {
  id: string;
  incident_number: string;
  driver_id: string;
  run_id?: string;
  stop_id?: string;
  shop_id?: string;
  vehicle_id?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  title: string;
  description: string;
  evidence_url?: string;
  latitude?: number;
  longitude?: number;
  status: 'REPORTED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  resolution_notes?: string;
  created_at: string;
  shop_name?: string;
  vehicle_registration?: string;
}

export interface ReportIncidentPayload {
  runId?: string;
  stopId?: string;
  shopId?: string;
  vehicleId?: string;
  category: IncidentCategory;
  severity?: IncidentSeverity;
  title: string;
  description: string;
  evidenceUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface ReconciliationPayload {
  runId: string;
  totalStopsPlanned: number;
  totalStopsCompleted: number;
  totalStopsFailed: number;
  totalCratesDispatched: number;
  totalCratesDelivered: number;
  totalCratesReturned: number;
  totalCashExpected: number;
  totalCashCollected: number;
  totalUpiCollected: number;
  totalAmountDeposited: number;
  notes?: string;
}

export interface DeliveryReconciliation {
  id: string;
  reconciliation_code: string;
  run_id: string;
  driver_id: string;
  total_stops_planned: number;
  total_stops_completed: number;
  total_stops_failed: number;
  total_crates_dispatched: number;
  total_crates_delivered: number;
  total_crates_returned: number;
  total_cash_expected: number;
  total_cash_collected: number;
  total_upi_collected: number;
  total_amount_deposited: number;
  variance: number;
  status: 'SUBMITTED' | 'VERIFIED' | 'DISCREPANCY_FLAGGED' | 'APPROVED';
  notes?: string;
  created_at: string;
}

export interface DriverPickupProduct {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  packSize: string;
  requiredQuantity: number;
  collectedQuantity: number;
  outstandingQuantity: number;
  status: 'PENDING' | 'COLLECTED' | 'SHORTAGE' | 'PARTIAL';
  shortageReason?: string | null;
  // STRICT REQUIREMENT: No product prices or monetary amounts for driver role
}

export interface DriverPickupStop {
  companyId: string;
  companyCode: string;
  companyName: string;
  companyType?: string;
  contactPerson?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  stopSequence: number;
  status: 'PENDING' | 'ARRIVED' | 'COLLECTED' | 'SHORTAGE' | 'SKIPPED';
  isUnlocked: boolean;
  proximityRadiusMeters?: number;
  arrivalTime?: string | null;
  completedTime?: string | null;
  verifiedDistanceMeters?: number | null;
  discrepancyReason?: string | null;
  totalRequiredUnits: number;
  totalCollectedUnits: number;
  products: DriverPickupProduct[];
}

export interface DriverPickupsResponse {
  runId: string;
  runCode?: string;
  routeName?: string;
  deliveryDate?: string;
  totalPickups: number;
  completedPickups: number;
  totalRequiredUnits: number;
  totalCollectedUnits: number;
  pickups: DriverPickupStop[];
}
