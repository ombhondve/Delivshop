import { dbPool } from '../config/database.js';
import { inventoryRepository } from '../repositories/inventory.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { companyRepository } from '../repositories/company.repository.js';
import { inventoryMovementCodeService } from './inventory-movement-code.service.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import {
  StockReceiptInput,
  StockAdjustmentInput,
  InventoryFilterParams,
  InventoryMovement,
  MovementType,
} from '../types/product.types.js';

export const inventoryService = {
  /**
   * Concurrency-safe stock receipt transaction
   */
  async receiveStock(
    input: StockReceiptInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<{ product: any; batch: any; movement: InventoryMovement }> {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock product row FOR UPDATE to prevent race conditions
      const productRes = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE;',
        [input.productId]
      );
      if (productRes.rows.length === 0) {
        throw new AppError(`Product with ID "${input.productId}" not found`, 404);
      }
      const productRow = productRes.rows[0];

      // 2. Validate supplier company
      const company = await companyRepository.findById(input.companyId);
      if (!company) {
        throw new AppError(`Supplier company with ID "${input.companyId}" not found`, 404);
      }
      if (company.status !== 'ACTIVE') {
        throw new AppError(`Cannot receive stock from inactive company "${company.name}"`, 400);
      }

      const receivedQty = Math.floor(input.quantity);
      if (receivedQty <= 0) {
        throw new AppError('Received quantity must be greater than zero', 400);
      }

      // 3. Batch number generation if not provided
      const batchNumber =
        input.batchNumber?.trim() ||
        `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${productRow.sku.slice(0, 6)}`;

      const unitCost = input.unitCost !== undefined ? Number(input.unitCost) : Number(productRow.purchase_cost || 0);

      const expiryDate =
        input.expiryDate ||
        new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

      // 4. Create or increment batch
      const batch = await inventoryRepository.createBatch(client, {
        productId: productRow.id,
        companyId: input.companyId,
        batchNumber,
        manufacturingDate: input.manufacturingDate || null,
        expiryDate,
        quantityReceived: receivedQty,
        quantityRemaining: receivedQty,
        purchaseCost: unitCost,
        notes: input.notes || 'Inward stock receipt',
      });

      // 5. Update product stock balance
      const previousStock = Number(productRow.stock_quantity || 0);
      const newStock = previousStock + receivedQty;
      await productRepository.updateProductStock(productRow.id, newStock, client);

      // 6. Generate unique movement number and append to ledger
      const movementNumber = await inventoryMovementCodeService.generateNextMovementNumber(client);

      const movement = await inventoryRepository.createMovement(client, {
        movementNumber,
        productId: productRow.id,
        batchId: batch.id,
        movementType: 'PURCHASE_RECEIPT',
        quantityChange: receivedQty,
        previousStock,
        newStock,
        unitCost,
        referenceType: 'RECEIPT',
        referenceId: input.referenceId || batchNumber,
        reason: input.notes || `Stock received from ${company.name}`,
        actorId,
      });

      // 7. Audit log
      let safeActorId = actorId;
      if (safeActorId) {
        const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [safeActorId]);
        if (userCheck.rows.length === 0) safeActorId = undefined;
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES ($1, 'STOCK_RECEIVED', 'INVENTORY', $2, $3, $4, NOW());`,
        [
          safeActorId || null,
          productRow.id,
          JSON.stringify({
            movementNumber,
            quantity: receivedQty,
            batchNumber,
            companyId: input.companyId,
            newStock,
          }),
          ipAddress || null,
        ]
      );

      await client.query('COMMIT');

      const updatedProduct = await productRepository.getProductById(productRow.id);
      logger.info(
        `Stock received: ${receivedQty} units of "${productRow.name}" (${batchNumber}) - New stock: ${newStock}`
      );

      return {
        product: updatedProduct,
        batch,
        movement,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Concurrency-safe stock adjustment transaction
   */
  async adjustStock(
    input: StockAdjustmentInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<{ product: any; movement: InventoryMovement }> {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock product row FOR UPDATE
      const productRes = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE;',
        [input.productId]
      );
      if (productRes.rows.length === 0) {
        throw new AppError(`Product with ID "${input.productId}" not found`, 404);
      }
      const productRow = productRes.rows[0];

      const previousStock = Number(productRow.stock_quantity || 0);
      const qtyChange = Math.floor(input.quantityChange);

      if (qtyChange === 0) {
        throw new AppError('Quantity change cannot be zero', 400);
      }

      const newStock = previousStock + qtyChange;
      if (newStock < 0) {
        throw new AppError(
          `Adjustment of ${qtyChange} would result in a negative stock quantity (${newStock}). Current available stock is ${previousStock}.`,
          400
        );
      }

      // 2. If batch ID specified, adjust batch balance
      let batchId: string | null = null;
      if (input.batchId) {
        const batchRes = await client.query(
          'SELECT * FROM inventory_batches WHERE id = $1 AND product_id = $2 FOR UPDATE;',
          [input.batchId, input.productId]
        );
        if (batchRes.rows.length === 0) {
          throw new AppError(`Specified batch ID "${input.batchId}" not found for this product`, 404);
        }
        const batchRow = batchRes.rows[0];
        const newBatchRemaining = Number(batchRow.quantity_remaining) + qtyChange;
        if (newBatchRemaining < 0) {
          throw new AppError(
            `Adjustment would cause batch "${batchRow.batch_number}" remaining quantity to fall below zero (${newBatchRemaining}).`,
            400
          );
        }
        await inventoryRepository.updateBatchRemaining(client, batchRow.id, newBatchRemaining);
        batchId = batchRow.id;
      }

      // 3. Update product balance
      await productRepository.updateProductStock(productRow.id, newStock, client);

      // 4. Map movement type
      let movementType: MovementType = 'STOCK_ADJUSTMENT_INCREASE';
      if (input.adjustmentType === 'DAMAGE') {
        movementType = 'DAMAGE_WRITE_OFF';
      } else if (input.adjustmentType === 'EXPIRY') {
        movementType = 'EXPIRY_DISPOSAL';
      } else if (qtyChange < 0) {
        movementType = 'STOCK_ADJUSTMENT_DECREASE';
      }

      // 5. Generate ledger movement
      const movementNumber = await inventoryMovementCodeService.generateNextMovementNumber(client);

      const movement = await inventoryRepository.createMovement(client, {
        movementNumber,
        productId: productRow.id,
        batchId,
        movementType,
        quantityChange: qtyChange,
        previousStock,
        newStock,
        unitCost: Number(productRow.purchase_cost || 0),
        referenceType: 'ADJUSTMENT',
        referenceId: input.referenceId || null,
        reason: input.reason,
        actorId,
      });

      // 6. Audit log
      let safeActorId = actorId;
      if (safeActorId) {
        const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [safeActorId]);
        if (userCheck.rows.length === 0) safeActorId = undefined;
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES ($1, 'STOCK_ADJUSTED', 'INVENTORY', $2, $3, $4, NOW());`,
        [
          safeActorId || null,
          productRow.id,
          JSON.stringify({
            movementNumber,
            quantityChange: qtyChange,
            previousStock,
            newStock,
            reason: input.reason,
            adjustmentType: input.adjustmentType,
          }),
          ipAddress || null,
        ]
      );

      await client.query('COMMIT');

      const updatedProduct = await productRepository.getProductById(productRow.id);
      logger.info(
        `Stock adjusted: ${qtyChange > 0 ? `+${qtyChange}` : qtyChange} for "${productRow.name}" (${movementNumber}) - New stock: ${newStock}`
      );

      return {
        product: updatedProduct,
        movement,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getMovements(params: InventoryFilterParams = {}) {
    return inventoryRepository.listMovements(params);
  },

  async getProductBatches(productId: string) {
    const product = await productRepository.getProductById(productId);
    if (!product) {
      throw new AppError(`Product with ID "${productId}" not found`, 404);
    }
    return inventoryRepository.getBatchesByProductId(productId);
  },
};
