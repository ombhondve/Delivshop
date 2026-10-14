import { shopRepository } from '../repositories/shop.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import {
  CreateShopInput,
  ProvisionedShopResponse,
  ShopFilterParams,
  ShopRecord,
  ShopStatus,
  UpdateShopInput,
} from '../types/shop.types.js';
import { generateTemporaryPassword, hashPassword } from '../utils/password.js';
import { auditService } from './audit.service.js';
import { resolveGoogleMapsUrl } from './map-resolver.service.js';

export const shopService = {
  /**
   * Register a new shop, generating atomic Shop ID and provisioning Argon2id temporary credentials.
   */
  async createShop(
    input: CreateShopInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<ProvisionedShopResponse> {
    // 1. Generate unique temporary password and Argon2id hash
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    // 2. Transactionally create user, shop, and shop account
    const result = await shopRepository.createWithAccount(input, passwordHash);

    // 3. Log security audit event
    await auditService.log({
      actorId,
      action: 'SHOP_CREATED',
      entityType: 'shop',
      entityId: result.shop.id,
      details: {
        shopId: result.shop.shop_id,
        name: result.shop.name,
        paymentTerms: result.shop.payment_terms,
        creditLimit: result.shop.credit_limit,
        isLocationVerified: result.shop.is_location_verified,
      },
      ipAddress,
    });

    return {
      shop: result.shop,
      credentials: {
        shopId: result.shop.shop_id,
        temporaryPassword,
        loginUrlNotice:
          'Share these initial credentials securely with the shop owner. The temporary password will expire and must be changed on first login.',
        mustChangePassword: true,
      },
    };
  },

  /**
   * List shops with filtering, search, pagination, and sorting.
   */
  async listShops(params: ShopFilterParams) {
    return shopRepository.findAll(params);
  },

  /**
   * Retrieve shop details by UUID or Shop ID.
   */
  async getShop(identifier: string): Promise<ShopRecord> {
    const shop = await shopRepository.findByIdOrShopId(identifier);
    if (!shop) {
      throw new Error('Shop not found');
    }
    return shop;
  },

  /**
   * Retrieve shop details along with account provisioning status.
   */
  async getShopWithAccount(identifier: string) {
    const shop = await this.getShop(identifier);
    const account = await shopRepository.getShopAccount(shop.id);

    return {
      shop,
      accountStatus: {
        shopId: shop.shop_id,
        isActive: shop.status === 'ACTIVE',
        mustChangePassword: account ? account.must_change_password : false,
        tempPasswordIssuedAt: account ? account.temp_password_issued_at : null,
        lastLoginAt: account ? account.last_login_at : null,
        failedAttempts: account ? account.failed_login_attempts : 0,
        isLocked: account?.locked_until ? new Date(account.locked_until) > new Date() : false,
      },
    };
  },

  /**
   * Update shop details, auditing sensitive changes.
   */
  async updateShop(
    identifier: string,
    input: UpdateShopInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<ShopRecord> {
    const existing = await this.getShop(identifier);

    const updated = await shopRepository.update(existing.id, input);
    if (!updated) {
      throw new Error('Failed to update shop');
    }

    // Audit sensitive changes: credit limits, payment terms, GPS coordinates
    const sensitiveChanges: Record<string, any> = {};
    if (input.creditLimit !== undefined && input.creditLimit !== existing.credit_limit) {
      sensitiveChanges.creditLimit = { old: existing.credit_limit, new: input.creditLimit };
    }
    if (input.paymentTerms !== undefined && input.paymentTerms !== existing.payment_terms) {
      sensitiveChanges.paymentTerms = { old: existing.payment_terms, new: input.paymentTerms };
    }
    if (input.latitude !== undefined && input.latitude !== existing.latitude) {
      sensitiveChanges.location = {
        old: { lat: existing.latitude, lng: existing.longitude },
        new: { lat: input.latitude, lng: input.longitude },
      };
    }

    if (Object.keys(sensitiveChanges).length > 0) {
      await auditService.log({
        actorId,
        action: 'SHOP_SECURITY_UPDATED',
        entityType: 'shop',
        entityId: existing.id,
        details: sensitiveChanges,
        ipAddress,
      });
    }

    return updated;
  },

  /**
   * Activate or deactivate shop account.
   */
  async updateStatus(
    identifier: string,
    status: ShopStatus,
    actorId?: string,
    ipAddress?: string
  ): Promise<ShopRecord> {
    const existing = await this.getShop(identifier);
    const updated = await shopRepository.updateStatus(existing.id, status);
    if (!updated) {
      throw new Error('Failed to update shop status');
    }

    await auditService.log({
      actorId,
      action: status === 'ACTIVE' ? 'SHOP_ACTIVATED' : 'SHOP_DEACTIVATED',
      entityType: 'shop',
      entityId: existing.id,
      details: { shopId: existing.shop_id, previousStatus: existing.status, newStatus: status },
      ipAddress,
    });

    return updated;
  },

  /**
   * Securely reissue temporary credentials for a shop owner.
   */
  async reissueCredentials(
    identifier: string,
    actorId?: string,
    ipAddress?: string
  ): Promise<{ shopId: string; temporaryPassword: string; mustChangePassword: true }> {
    const shop = await this.getShop(identifier);

    const temporaryPassword = generateTemporaryPassword();
    const newPasswordHash = await hashPassword(temporaryPassword);

    const success = await shopRepository.reissueCredentials(shop.id, newPasswordHash);
    if (!success) {
      throw new Error('Failed to reissue shop credentials');
    }

    await auditService.log({
      actorId,
      action: 'SHOP_CREDENTIALS_REISSUED',
      entityType: 'shop',
      entityId: shop.id,
      details: { shopId: shop.shop_id },
      ipAddress,
    });

    return {
      shopId: shop.shop_id,
      temporaryPassword,
      mustChangePassword: true,
    };
  },

  /**
   * SSRF-safe resolution of Google Maps links.
   */
  async resolveMapLink(mapUrl: string) {
    return resolveGoogleMapsUrl(mapUrl);
  },

  async getInvoices(identifier: string) {
    const shop = await this.getShop(identifier);
    return shopRepository.getInvoices(shop.id);
  },

  async getPayments(identifier: string) {
    const shop = await this.getShop(identifier);
    return shopRepository.getPayments(shop.id);
  },

  async getDeliveries(identifier: string) {
    const shop = await this.getShop(identifier);
    return shopRepository.getDeliveries(shop.id);
  },

  async getProducts(identifier: string) {
    const shop = await this.getShop(identifier);
    return shopRepository.listProducts(shop.id);
  },

  async getStats(identifier: string) {
    const shop = await this.getShop(identifier);
    const orders = await orderRepository.findByShopId(shop.id);
    const todayRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      totalOrders: orders.length,
      todayRevenue,
      activeProducts: (await shopRepository.listProducts(shop.id)).length,
      outstandingBalance: Number(shop.outstanding_balance || 0),
      creditLimit: Number(shop.credit_limit || 0),
      paymentTerms: shop.payment_terms,
      status: shop.status,
    };
  },
};
