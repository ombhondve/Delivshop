import { dbPool } from '../config/database.js';
import { productRepository } from '../repositories/product.repository.js';
import { inventoryRepository } from '../repositories/inventory.repository.js';
import { companyRepository } from '../repositories/company.repository.js';
import { inventoryMovementCodeService } from './inventory-movement-code.service.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import {
  Product,
  ProductFilterParams,
  ProductSummaryStats,
  CreateProductInput,
  UpdateProductInput,
  InventoryBatch,
} from '../types/product.types.js';

export const productService = {
  async listProducts(params: ProductFilterParams = {}): Promise<{
    items: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return productRepository.listProducts(params);
  },

  async getProduct(id: string): Promise<Product & { batches: InventoryBatch[] }> {
    const product = await productRepository.getProductById(id);
    if (!product) {
      throw new AppError(`Product with ID or SKU "${id}" not found`, 404);
    }

    const batches = await inventoryRepository.getBatchesByProductId(product.id);
    return {
      ...product,
      batches,
    };
  },

  async createProduct(
    input: CreateProductInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<Product> {
    // 1. Verify supplier company exists and is active
    const company = await companyRepository.findById(input.companyId);
    if (!company) {
      throw new AppError(`Supplier company with ID "${input.companyId}" not found`, 404);
    }
    if (company.status !== 'ACTIVE') {
      throw new AppError(
        `Supplier company "${company.name}" is currently inactive. Products can only be assigned to active companies.`,
        400
      );
    }

    // 2. Generate or validate SKU
    let sku = input.sku?.trim().toUpperCase();
    if (!sku) {
      const catPrefix = input.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD');
      const namePrefix = input.name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      sku = `${catPrefix}-${namePrefix}-${rand}`;
    }

    const existingSku = await productRepository.getProductBySku(sku);
    if (existingSku) {
      throw new AppError(`A product with SKU "${sku}" already exists`, 409);
    }

    const initialStock = Math.max(0, input.initialStock || 0);

    // 3. If initial stock is entered, run atomically in a database transaction
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      const product = await productRepository.createProduct(
        {
          ...input,
          sku,
          initialStock,
        },
        client
      );

      // If opening stock entered, record opening batch and ledger movement
      if (initialStock > 0) {
        const batchNumber =
          input.initialBatchNumber?.trim() ||
          `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${sku.slice(0, 6)}`;

        const expiryDate =
          input.initialExpiryDate ||
          new Date(Date.now() + (input.shelfLifeDays || 10) * 86400000).toISOString().slice(0, 10);

        const batch = await inventoryRepository.createBatch(client, {
          productId: product.id,
          companyId: input.companyId,
          batchNumber,
          manufacturingDate: input.initialManufacturingDate || null,
          expiryDate,
          quantityReceived: initialStock,
          quantityRemaining: initialStock,
          purchaseCost: input.purchaseCost || 0,
          notes: 'Opening stock received upon catalogue registration',
        });

        const movementNumber = await inventoryMovementCodeService.generateNextMovementNumber(client);

        await inventoryRepository.createMovement(client, {
          movementNumber,
          productId: product.id,
          batchId: batch.id,
          movementType: 'OPENING_STOCK',
          quantityChange: initialStock,
          previousStock: 0,
          newStock: initialStock,
          unitCost: input.purchaseCost || 0,
          referenceType: 'OPENING_STOCK',
          referenceId: batchNumber,
          reason: 'Initial opening stock registered during product creation',
          actorId,
        });
      }

      // Record audit log
      let safeActorId = actorId;
      if (safeActorId) {
        const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [safeActorId]);
        if (userCheck.rows.length === 0) safeActorId = undefined;
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES ($1, 'PRODUCT_CREATED', 'PRODUCT', $2, $3, $4, NOW());`,
        [
          safeActorId || null,
          product.id,
          JSON.stringify({
            name: product.name,
            sku: product.sku,
            companyId: product.companyId,
            initialStock,
            price: product.price,
          }),
          ipAddress || null,
        ]
      );

      await client.query('COMMIT');

      logger.info(`Product created successfully: "${product.name}" (${product.sku})`);
      return product;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateProduct(
    id: string,
    input: UpdateProductInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<Product> {
    const existing = await productRepository.getProductById(id);
    if (!existing) {
      throw new AppError(`Product with ID "${id}" not found`, 404);
    }

    if (input.companyId && input.companyId !== existing.companyId) {
      const company = await companyRepository.findById(input.companyId);
      if (!company) {
        throw new AppError(`Supplier company with ID "${input.companyId}" not found`, 404);
      }
      if (company.status !== 'ACTIVE') {
        throw new AppError(`Target supplier company "${company.name}" is inactive`, 400);
      }
    }

    const updated = await productRepository.updateProduct(id, input);
    if (!updated) {
      throw new AppError(`Product with ID "${id}" could not be updated`, 500);
    }

    // Write audit log
    try {
      let safeActorId = actorId;
      if (safeActorId) {
        const userCheck = await dbPool.query('SELECT id FROM users WHERE id = $1', [safeActorId]);
        if (userCheck.rows.length === 0) safeActorId = undefined;
      }

      await dbPool.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES ($1, 'PRODUCT_UPDATED', 'PRODUCT', $2, $3, $4, NOW());`,
        [
          safeActorId || null,
          id,
          JSON.stringify({
            updatedFields: Object.keys(input),
            price: updated.price,
            companyId: updated.companyId,
          }),
          ipAddress || null,
        ]
      );
    } catch (auditErr: any) {
      logger.warn(`Failed to write product update audit log: ${auditErr.message}`);
    }

    return updated;
  },

  async updateProductStatus(
    id: string,
    isActive: boolean,
    reason?: string,
    actorId?: string,
    ipAddress?: string
  ): Promise<Product> {
    const existing = await productRepository.getProductById(id);
    if (!existing) {
      throw new AppError(`Product with ID "${id}" not found`, 404);
    }

    const updated = await productRepository.updateProductStatus(id, isActive);
    if (!updated) {
      throw new AppError(`Product with ID "${id}" status could not be changed`, 500);
    }

    // Write audit log
    try {
      let safeActorId = actorId;
      if (safeActorId) {
        const userCheck = await dbPool.query('SELECT id FROM users WHERE id = $1', [safeActorId]);
        if (userCheck.rows.length === 0) safeActorId = undefined;
      }

      await dbPool.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES ($1, 'PRODUCT_STATUS_CHANGED', 'PRODUCT', $2, $3, $4, NOW());`,
        [
          safeActorId || null,
          id,
          JSON.stringify({
            previousStatus: existing.isActive ? 'ACTIVE' : 'INACTIVE',
            newStatus: isActive ? 'ACTIVE' : 'INACTIVE',
            reason: reason || 'Administrative action',
          }),
          ipAddress || null,
        ]
      );
    } catch (auditErr: any) {
      logger.warn(`Failed to write status change audit log: ${auditErr.message}`);
    }

    return updated;
  },

  async getSummaryStats(): Promise<ProductSummaryStats> {
    return productRepository.getProductSummaryStats();
  },
};
