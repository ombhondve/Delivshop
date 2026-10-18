/**
 * Shared Indian Rupee (INR) Currency Formatter.
 * Consistent across all Shop and Driver mobile views, matching en-IN locale and ₹ symbol.
 *
 * Example: 1250 -> "₹1,250.00"
 * Example: 85.5 -> "₹85.50"
 * Example: 12500 -> "₹12,500.00"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₹0.00';
  }
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(numericAmount) || !isFinite(numericAmount)) {
    return '₹0.00';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `₹${numericAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
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
