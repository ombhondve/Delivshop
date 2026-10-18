import { apiClient } from './client';
import { Delivery, UpdateDeliveryStatusPayload } from '@/types/delivery';
import {
  DriverAttendance,
  AttendanceSummary,
  DeliveryRun,
  CompleteDeliveryPayload,
  DeliveryCollection,
  CollectionSummary,
  VehicleInspectionPayload,
  VehicleInspection,
  DriverIncident,
  ReportIncidentPayload,
  ReconciliationPayload,
  DeliveryReconciliation,
  AssignedVehicle,
  DriverPickupsResponse,
} from '@/types/driver.types';

export const driverApi = {
  // 1. Shift & Attendance Lifecycle
  async startShift(
    driverId: string,
    payload: { latitude?: number; longitude?: number; notes?: string } = {}
  ): Promise<DriverAttendance> {
    return apiClient<DriverAttendance>(`deliveries/drivers/${driverId}/attendance/check-in`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async endShift(
    driverId: string,
    payload: { latitude?: number; longitude?: number; notes?: string } = {}
  ): Promise<DriverAttendance> {
    return apiClient<DriverAttendance>(`deliveries/drivers/${driverId}/attendance/check-out`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getTodayAttendance(driverId: string): Promise<DriverAttendance | null> {
    return apiClient<DriverAttendance | null>(`deliveries/drivers/${driverId}/attendance/today`);
  },

  async getAttendanceSummary(driverId: string): Promise<AttendanceSummary> {
    return apiClient<AttendanceSummary>(`deliveries/drivers/${driverId}/attendance/summary`);
  },

  async getAttendanceHistory(driverId: string): Promise<DriverAttendance[]> {
    return apiClient<DriverAttendance[]>(`deliveries/drivers/${driverId}/attendance`);
  },

  // 2. Dispatches & Route Management
  async getAssignedDispatches(): Promise<DeliveryRun[]> {
    return apiClient<DeliveryRun[]>('assignments');
  },

  async getDispatchDetails(runId: string): Promise<DeliveryRun> {
    return apiClient<DeliveryRun>(`assignments/${runId}`);
  },

  async updateDispatchStatus(
    runId: string,
    status: DeliveryRun['status'],
    notes?: string
  ): Promise<DeliveryRun> {
    return apiClient<DeliveryRun>(`assignments/${runId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  async updateStopStatus(
    runId: string,
    sequence: number,
    payload: {
      status: 'PENDING' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
      notes?: string;
      proofOfDeliveryUrl?: string;
      failureReason?: string;
      deliveredCratesCount?: number;
      returnedCratesCount?: number;
      shortageReason?: string | null;
      collectedAmount?: number;
      paymentMethod?: string;
      otpCode?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<any> {
    return apiClient(`assignments/${runId}/stops/${sequence}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // 3. Deliveries & Orders
  async getAssignedDeliveries(): Promise<Delivery[]> {
    return apiClient<Delivery[]>('deliveries/assigned');
  },

  async getDeliveryDetails(deliveryId: string): Promise<Delivery> {
    return apiClient<Delivery>(`deliveries/${deliveryId}`);
  },

  async updateDeliveryStatus(
    deliveryId: string,
    payload: UpdateDeliveryStatusPayload
  ): Promise<Delivery> {
    return apiClient<Delivery>(`deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async completeDelivery(
    deliveryId: string,
    payload: CompleteDeliveryPayload
  ): Promise<{ delivery: Delivery; collection?: DeliveryCollection }> {
    return apiClient<{ delivery: Delivery; collection?: DeliveryCollection }>(
      `deliveries/${deliveryId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // 4. Vehicle & Pre-dispatch Inspection
  async getVehicleDetails(vehicleId: string): Promise<AssignedVehicle> {
    return apiClient<AssignedVehicle>(`vehicles/${vehicleId}`);
  },

  async submitVehicleInspection(payload: VehicleInspectionPayload): Promise<VehicleInspection> {
    return apiClient<VehicleInspection>('deliveries/inspection', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRecentInspections(): Promise<VehicleInspection[]> {
    return apiClient<VehicleInspection[]>('deliveries/inspection/history');
  },

  // 5. Collections & Payments
  async getCollections(): Promise<DeliveryCollection[]> {
    return apiClient<DeliveryCollection[]>('collections');
  },

  async getCollectionSummary(): Promise<CollectionSummary> {
    return apiClient<CollectionSummary>('collections/summary');
  },

  async recordCollection(payload: {
    runId: string;
    shopId: string;
    amount: number;
    paymentMethod: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
    transactionReference?: string;
    notes?: string;
  }): Promise<DeliveryCollection> {
    return apiClient<DeliveryCollection>('collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 6. Exceptions & Incidents
  async reportIncident(payload: ReportIncidentPayload): Promise<DriverIncident> {
    return apiClient<DriverIncident>('deliveries/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getReportedIncidents(): Promise<DriverIncident[]> {
    return apiClient<DriverIncident[]>('deliveries/incidents');
  },

  // 7. Shift Reconciliation & Closure
  async submitReconciliation(payload: ReconciliationPayload): Promise<DeliveryReconciliation> {
    return apiClient<DeliveryReconciliation>('deliveries/reconciliation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 8. Driver Profile & History
  async getDriverProfile(driverId: string): Promise<any> {
    return apiClient<any>(`deliveries/drivers/${driverId}`);
  },

  // 9. Location Update
  async updateLocation(latitude: number, longitude: number): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>('deliveries/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    }).catch(() => ({ success: false }));
  },

  // 10. Supplier Pickups (Part H, I, J)
  async getAssignedPickups(runId: string): Promise<DriverPickupsResponse> {
    return apiClient<DriverPickupsResponse>(`deliveries/runs/${runId}/pickups`);
  },

  async verifyPickupProximity(
    runId: string,
    companyId: string,
    coords: { latitude: number; longitude: number; accuracy?: number }
  ): Promise<any> {
    return apiClient(`deliveries/runs/${runId}/pickups/${companyId}/verify-proximity`, {
      method: 'POST',
      body: JSON.stringify(coords),
    });
  },

  async confirmPickup(
    runId: string,
    companyId: string,
    payload: {
      items: { productId: string; collectedQuantity: number; shortageReason?: string | null }[];
      notes?: string;
    }
  ): Promise<any> {
    return apiClient(`deliveries/runs/${runId}/pickups/${companyId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
