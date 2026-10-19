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

/**
 * Format delivery dates into human readable standard (e.g. "21 October 2026")
 * Parses YYYY-MM-DD components directly to prevent local timezone UTC offset skew.
 */
export function formatDeliveryDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const monthIndex = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        const dateObj = new Date(year, monthIndex, day);
        return dateObj.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
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
