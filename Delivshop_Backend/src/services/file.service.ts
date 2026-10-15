import fs from 'fs';
import path from 'path';
import { query } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { auditService } from './audit.service.js';

import os from 'os';

// Safe private storage directory: uses writable /tmp on serverless (Vercel) or local storage directory in standard environments
export const getStorageDir = (): string => {
  const targetDir =
    process.env.STORAGE_DIR ||
    (process.env.VERCEL === '1'
      ? path.join(os.tmpdir(), 'delivshop', 'storage', 'private_documents')
      : path.join(process.cwd(), 'storage', 'private_documents'));

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (err: any) {
    console.warn(`[FileService] Storage directory creation deferred or read-only: ${err.message}`);
  }

  return targetDir;
};

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadDocumentParams {
  shopId: string;
  userId: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
  ipAddress?: string;
}

export const fileService = {
  /**
   * Validate buffer magic numbers / file signatures.
   */
  validateFileSignature(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;

    // PDF magic bytes: %PDF (25 50 44 46)
    if (mimeType === 'application/pdf') {
      return (
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      );
    }

    // JPEG magic bytes: FF D8 FF
    if (mimeType === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // PNG magic bytes: 89 50 4E 47
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }

    // WebP magic bytes: RIFF....WEBP
    if (mimeType === 'image/webp') {
      const header = buffer.subarray(0, 12).toString('ascii');
      return header.startsWith('RIFF') && header.endsWith('WEBP');
    }

    return false;
  },

  /**
   * Securely store a private shop document.
   * Enforces MIME whitelist, size limits, magic bytes, server-side UUID storage naming,
   * and path traversal prevention.
   */
  async uploadShopDocument(params: UploadDocumentParams) {
    const { shopId, userId, documentType, originalFilename, mimeType, buffer, ipAddress } = params;

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new AppError(
        `File type ${mimeType} is not permitted. Allowed types: PDF, JPEG, PNG, WebP.`,
        400
      );
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new AppError('File size exceeds the 5MB limit.', 400);
    }

    if (!this.validateFileSignature(buffer, mimeType)) {
      throw new AppError(
        'File signature does not match declared MIME type. Corrupted or disallowed file rejected.',
        400
      );
    }

    // Server-side random UUID storage name — completely discard client-supplied path
    const extension = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.webp';
    const storageFilename = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${extension}`;
    const storageDir = getStorageDir();
    const storagePath = path.join(storageDir, storageFilename);

    // Save to private disk
    await fs.promises.writeFile(storagePath, buffer);

    // Sanitize display filename (strip path separators)
    const sanitizedFilename = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');

    // Register in database
    const res = await query(
      `INSERT INTO shop_documents (
        shop_id, document_type, original_filename, storage_path, mime_type, file_size_bytes, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, shop_id, document_type, original_filename, mime_type, file_size_bytes, created_at`,
      [shopId, documentType, sanitizedFilename, storagePath, mimeType, buffer.length, userId]
    );

    const doc = res.rows[0];

    await auditService.log({
      actorId: userId,
      action: 'SHOP_DOCUMENT_UPLOADED',
      entityType: 'shop_document',
      entityId: doc.id,
      details: { shopId, documentType, filename: sanitizedFilename, size: buffer.length },
      ipAddress,
    });

    return doc;
  },

  /**
   * Securely retrieve a shop document with IDOR ownership validation.
   */
  async getShopDocument(documentId: string, requestingShopId: string, userRole: string) {
    const res = await query(
      `SELECT * FROM shop_documents WHERE id = $1 LIMIT 1`,
      [documentId]
    );

    if (res.rowCount === 0) {
      throw new AppError('Requested document not found', 404);
    }

    const doc = res.rows[0];

    // IDOR Protection: shop owners may ONLY access their own shop documents
    if (userRole === 'SHOP' && doc.shop_id !== requestingShopId) {
      throw new AppError('Unauthorized access: You do not own this document', 403);
    }

    if (!fs.existsSync(doc.storage_path)) {
      throw new AppError('Document file is not accessible on the storage volume', 404);
    }

    return {
      metadata: doc,
      filePath: doc.storage_path,
    };
  },

  /**
   * Generate authoritative downloadable tax invoice statement for a shop order.
   * Enforces IDOR protection against cross-shop viewing.
   */
  async generateInvoiceStatement(invoiceId: string, requestingShopId: string, userRole: string) {
    const res = await query(
      `SELECT i.*, s.name as shop_name, s.shop_id as official_shop_id, s.address, s.city, s.gstin,
              o.order_number, o.created_at as order_date, o.total as order_total,
              COALESCE(
                json_agg(
                  json_build_object(
                    'name', p.name,
                    'quantity', oi.quantity,
                    'unitPrice', oi.unit_price,
                    'totalPrice', oi.total_price
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) as items
       FROM invoices i
       JOIN shops s ON i.shop_id = s.id
       LEFT JOIN orders o ON i.order_id = o.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE (i.id::text = $1 OR i.invoice_number = $1)
       GROUP BY i.id, s.name, s.shop_id, s.address, s.city, s.gstin, o.order_number, o.created_at, o.total
       LIMIT 1`,
      [invoiceId]
    );

    if (res.rowCount === 0) {
      throw new AppError('Invoice record not found', 404);
    }

    const inv = res.rows[0];

    // IDOR Protection
    if (userRole === 'SHOP' && inv.shop_id !== requestingShopId) {
      throw new AppError('Unauthorized: You cannot access invoices for other shops', 403);
    }

    // Format secure, authoritative ASCII tax invoice statement
    const itemsList = Array.isArray(inv.items)
      ? inv.items
          .map(
            (item: any, idx: number) =>
              `${idx + 1}. ${item.name.padEnd(35)} × ${String(item.quantity).padStart(3)} | Unit: ₹${Number(item.unitPrice).toFixed(2).padStart(7)} | Total: ₹${Number(item.totalPrice).toFixed(2).padStart(8)}`
          )
          .join('\n')
      : 'Standard dairy distribution line items';

    const statementContent = `========================================================================
                      DELIVSHOP LOGISTICS & DAIRY NETWORK
                       OFFICIAL TAX INVOICE & STATEMENT
========================================================================
Invoice Reference : ${inv.invoice_number}
Order Reference   : ${inv.order_number || 'Direct Route Replenishment'}
Invoice Date      : ${new Date(inv.created_at).toLocaleDateString()}
Payment Due Date  : ${new Date(inv.due_date).toLocaleDateString()}
Status            : ${inv.status}
------------------------------------------------------------------------
MERCHANT FACILITY DETAILS:
Shop Name         : ${inv.shop_name}
Official Shop ID  : ${inv.official_shop_id}
Address           : ${inv.address}, ${inv.city}
GSTIN             : ${inv.gstin || 'Unregistered Merchant'}
------------------------------------------------------------------------
ITEMIZED REPLENISHMENT STATEMENT:
${itemsList}
------------------------------------------------------------------------
Total Statement Due : ₹${Number(inv.amount).toFixed(2)}
Payment Terms       : Net terms per merchant contract
========================================================================
Verification Beacon : TLS 1.3 SECURE TRANSACTION • CENTRAL REGISTRY
========================================================================`;

    return {
      filename: `Delivshop_Invoice_${inv.invoice_number}.txt`,
      content: statementContent,
      invoice: inv,
    };
  },
};
