import { orderRepository, sanitizeOrderForShop } from '../repositories/order.repository.js';
import { auditService } from './audit.service.js';
import { notificationService, ReminderResult } from './notification.service.js';
import { AppError } from '../utils/errors.js';

export const orderService = {
  async getOrder(orderId: string, role?: string, userShopId?: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    if (role === 'SHOP') {
      if (userShopId && order.shop_id !== userShopId) {
        throw new AppError('Forbidden: You do not have permission to access orders from another shop', 403);
      }
      return sanitizeOrderForShop(order);
    }

    return order;
  },

  async getShopOrders(shopId: string) {
    return orderRepository.findByShopId(shopId);
  },

  async assignRoute(orderId: string, routeId: string, actorId?: string, ipAddress?: string) {
    return orderRepository.assignRoute(orderId, routeId, actorId, ipAddress);
  },

  async createOrder(
    data: {
      shopId: string;
      items: Array<{ productId: string; quantity: number }>;
      deliveryAddress: any;
      idempotencyKey?: string;
      requestedDeliveryDate?: string;
      deliveryRunId?: string;
      deliveryWindow?: string;
      isShopRole?: boolean;
      isShopPortal?: boolean;
    },
    userId: string,
    ipAddress?: string
  ) {
    const order = await orderRepository.createOrder({
      shopId: data.shopId,
      userId,
      items: data.items,
      deliveryAddress: data.deliveryAddress,
      idempotencyKey: data.idempotencyKey,
      requestedDeliveryDate: data.requestedDeliveryDate,
      deliveryRunId: data.deliveryRunId,
      deliveryWindow: data.deliveryWindow,
      isShopRole: data.isShopRole,
      isShopPortal: data.isShopPortal,
    });

    if (!order.isDuplicateReplay) {
      await auditService.log({
        actorId: userId,
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        details: {
          orderNumber: order.order_number,
          itemCount: data.items.length,
          total: order.total,
          idempotencyKey: data.idempotencyKey,
          schedulingStatus: order.scheduling_status,
          requestedDeliveryDate: order.requested_delivery_date,
          confirmedDeliveryDate: order.confirmed_delivery_date,
        },
        ipAddress,
      });
    }

    return order;
  },

  async updateStatus(orderId: string, status: string, actorId: string, ipAddress?: string) {
    const updated = await orderRepository.updateStatus(orderId, status);
    if (!updated) throw new AppError('Order not found or update failed', 404);

    await auditService.log({
      actorId,
      action: 'ORDER_STATUS_UPDATED',
      entityType: 'order',
      entityId: orderId,
      details: { status },
      ipAddress,
    });

    return updated;
  },

  async listOrders(filters: {
    status?: string;
    schedulingStatus?: string;
    search?: string;
    shopId?: string;
    driverId?: string;
    routeId?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    return orderRepository.listOrders(filters);
  },

  async getVolumeSummary(filters: {
    status?: string;
    deliveryDate?: string;
    date?: string;
    shopId?: string;
    productId?: string;
    packagingSize?: string;
  }) {
    return orderRepository.getVolumeSummary(filters);
  },

  /**
   * Export Consolidated Dispatch Summary as CSV
   * Strictly includes ONLY: Product Name, SKU, Packaging Type, Package Size, Total Packages, Total Volume (L)
   * With Total Crates completely removed per operational requirements.
   */
  async exportVolumeSummaryCsv(filters: {
    status?: string;
    deliveryDate?: string;
    date?: string;
    shopId?: string;
    productId?: string;
    packagingSize?: string;
  }): Promise<string> {
    const summary = await orderRepository.getVolumeSummary(filters);
    const { overview, packagingBreakdown, shopWiseSummary, metadata } = summary;

    const escapeCsv = (str: any) => {
      if (str == null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines: string[] = [];

    // Header & Metadata
    lines.push('DELIVSHOP - CONSOLIDATED MILK & PACKAGING DISPATCH SUMMARY');
    lines.push(`Generated At,${escapeCsv(metadata.generatedAt)}`);
    lines.push(`Included Statuses,${escapeCsv(overview.includedStatuses.join(', '))}`);
    lines.push(`Applied Filters,${escapeCsv(JSON.stringify(filters))}`);
    lines.push('');

    // Section 1: Overview KPIs (No crate KPIs)
    lines.push('--- SUMMARY OVERVIEW ---');
    lines.push('Metric,Value,Unit');
    lines.push(`Total Eligible Orders,${overview.totalEligibleOrders},Orders`);
    lines.push(`Total Liquid Volume,${overview.totalLiquidVolumeLitres},Litres (L)`);
    lines.push(`Total Individual Packages,${overview.totalPackagesRequired},Packages`);
    lines.push(`Distinct Products,${overview.distinctProductsCount},Products`);
    lines.push(`Included Shops,${overview.includedShopsCount},Shops`);
    lines.push('');

    // Section 2: Packaging Breakdown by Product (Strictly 6 Columns, zero crates)
    lines.push('--- PACKAGING BREAKDOWN BY PRODUCT ---');
    lines.push('Product Name,SKU,Packaging Type,Package Size,Total Packages,Total Volume (L)');
    for (const p of packagingBreakdown) {
      lines.push([
        escapeCsv(p.productName),
        escapeCsv(p.sku),
        escapeCsv(p.packagingType),
        escapeCsv(p.packageSize),
        p.totalPackages,
        p.isLiquid ? (p.totalVolumeLitres != null ? `${p.totalVolumeLitres} L` : '0 L') : 'Not applicable (Sold by weight)',
      ].join(','));
    }
    lines.push('');

    // Section 3: Shop-Wise Summary (Zero Crates)
    lines.push('--- SHOP-WISE ORDER SUMMARY ---');
    lines.push('Shop Name,Shop ID,Order Number,Order Status,Dispatch Status,Driver,Delivery Route,Liquid Volume (L),Total Packages');
    for (const s of shopWiseSummary) {
      lines.push([
        escapeCsv(s.shopName),
        escapeCsv(s.shopCode),
        escapeCsv(s.orderNumber),
        escapeCsv(s.orderStatus),
        escapeCsv(s.dispatchStatus),
        escapeCsv(s.driverName),
        escapeCsv(s.routeName),
        `${s.totalLiquidVolumeLitres} L`,
        s.totalPackages,
      ].join(','));
    }
    lines.push('');

    // Section 4: Detailed Order Items (Zero Crates)
    lines.push('--- ITEM-LEVEL PACKAGING BREAKDOWN ---');
    lines.push('Order Number,Shop Name,Product Name,SKU,Package Size,Type,Quantity (Pkts),Volume (L),Unit Price,Total Price');
    for (const s of shopWiseSummary) {
      for (const item of s.items || []) {
        lines.push([
          escapeCsv(s.orderNumber),
          escapeCsv(s.shopName),
          escapeCsv(item.productName),
          escapeCsv(item.sku),
          escapeCsv(item.packageSize),
          escapeCsv(item.packagingType),
          item.quantity,
          item.isLiquid ? (item.volumeLitres != null ? `${item.volumeLitres} L` : '0 L') : 'Not applicable',
          item.unitPrice,
          item.totalPrice,
        ].join(','));
      }
    }

    return lines.join('\r\n');
  },

  /**
   * Shop Order Tracking: Retrieves exact summary counts and filtered shops list
   */
  async getShopOrderTracking(filters: {
    date?: string;
    search?: string;
    orderStatus?: string;
    reminderStatus?: string;
    page?: number;
    limit?: number;
  }) {
    return orderRepository.getShopOrderTracking(filters);
  },

  /**
   * Send an order reminder to a single shop
   */
  async sendShopReminder(params: {
    shopId: string;
    reportingDate: string;
    reminderType?: string;
    customMessage?: string;
    sentBy?: string;
    idempotencyKey?: string;
  }): Promise<ReminderResult> {
    const res = await notificationService.sendShopReminder(params);

    if (params.sentBy) {
      await auditService.log({
        actorId: params.sentBy,
        action: 'ORDER_REMINDER_SENT',
        entityType: 'shop',
        entityId: res.shopId,
        details: {
          reportingDate: params.reportingDate,
          status: res.status,
          provider: res.provider,
          channel: res.channel,
          errorReason: res.errorReason,
        },
      });
    }

    return res;
  },

  /**
   * Send bulk order reminders to multiple shops
   */
  async sendBulkReminders(params: {
    shopIds: string[];
    reportingDate: string;
    reminderType?: string;
    customMessage?: string;
    sentBy?: string;
  }) {
    const result = await notificationService.sendBulkReminders(params);

    if (params.sentBy) {
      await auditService.log({
        actorId: params.sentBy,
        action: 'BULK_ORDER_REMINDERS_SENT',
        entityType: 'bulk_action',
        entityId: result.batchId,
        details: {
          totalRequested: result.totalRequested,
          acceptedCount: result.acceptedCount,
          failedCount: result.failedCount,
          noDeviceCount: result.noDeviceCount,
          reportingDate: params.reportingDate,
        },
      });
    }

    return result;
  },

  /**
   * Get reminder history for a shop
   */
  async getReminderHistory(shopId: string, limit?: number) {
    return notificationService.getReminderHistory(shopId, limit);
  },

  /**
   * Register mobile device token for push notifications
   */
  async registerDeviceToken(params: {
    shopId: string;
    userId?: string;
    fcmToken: string;
    deviceType?: string;
  }) {
    return notificationService.registerDeviceToken(params);
  },
};
