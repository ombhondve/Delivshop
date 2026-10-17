import { orderRepository } from '../repositories/order.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export const orderService = {
  async getOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    return order;
  },

  async getShopOrders(shopId: string) {
    return orderRepository.findByShopId(shopId);
  },

  async createOrder(
    data: {
      shopId: string;
      items: Array<{ productId: string; quantity: number }>;
      deliveryAddress: any;
      idempotencyKey?: string;
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
    search?: string;
    shopId?: string;
    driverId?: string;
    routeId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
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

    // Section 1: Overview KPIs
    lines.push('--- SUMMARY OVERVIEW ---');
    lines.push('Metric,Value,Unit');
    lines.push(`Total Eligible Orders,${overview.totalEligibleOrders},Orders`);
    lines.push(`Total Liquid Volume,${overview.totalLiquidVolumeLitres},Litres (L)`);
    lines.push(`Total Individual Packages,${overview.totalPackagesRequired},Packages`);
    lines.push(`Total Crates Required,${overview.totalCratesRequired ?? 'Incomplete packaging config'},Crates`);
    lines.push(`Distinct Products,${overview.distinctProductsCount},Products`);
    lines.push(`Included Shops,${overview.includedShopsCount},Shops`);
    lines.push('');

    // Section 2: Packaging Breakdown by Product
    lines.push('--- PACKAGING BREAKDOWN BY PRODUCT ---');
    lines.push('Product Name,SKU,Packaging Type,Package Size,Total Packages,Total Volume (L),Total Crates,Units per Crate,Packaging Status');
    for (const p of packagingBreakdown) {
      lines.push([
        escapeCsv(p.productName),
        escapeCsv(p.sku),
        escapeCsv(p.packagingType),
        escapeCsv(p.packageSize),
        p.totalPackages,
        p.isLiquid ? (p.totalVolumeLitres != null ? `${p.totalVolumeLitres} L` : '0 L') : 'Not applicable (Sold by weight)',
        p.totalCrates != null ? p.totalCrates : 'Unavailable',
        p.crateCapacity != null ? p.crateCapacity : 'Not configured',
        p.isCrateCapacityKnown ? 'Configured' : escapeCsv(p.missingConfigReason || 'Missing config'),
      ].join(','));
    }
    lines.push('');

    // Section 3: Shop-Wise Summary
    lines.push('--- SHOP-WISE ORDER SUMMARY ---');
    lines.push('Shop Name,Shop ID,Order Number,Order Status,Dispatch Status,Driver,Delivery Route,Liquid Volume (L),Total Packages,Total Crates');
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
        s.totalCrates != null ? s.totalCrates : 'Unavailable',
      ].join(','));
    }
    lines.push('');

    // Section 4: Detailed Order Items
    lines.push('--- ITEM-LEVEL PACKAGING BREAKDOWN ---');
    lines.push('Order Number,Shop Name,Product Name,SKU,Package Size,Type,Quantity (Pkts),Volume (L),Crates,Unit Price,Total Price');
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
          item.cratesCount != null ? item.cratesCount : 'Unavailable',
          item.unitPrice,
          item.totalPrice,
        ].join(','));
      }
    }

    return lines.join('\r\n');
  },
};
