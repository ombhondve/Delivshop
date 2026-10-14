export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
      return '#10B981';
    case 'IN_TRANSIT':
    case 'EN_ROUTE_PICKUP':
    case 'EN_ROUTE_DROPOFF':
      return '#3B82F6';
    case 'PENDING':
    case 'PREPARING':
      return '#F59E0B';
    case 'CANCELLED':
    case 'FAILED':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}
