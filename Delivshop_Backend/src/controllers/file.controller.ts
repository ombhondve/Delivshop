import { Request, Response, NextFunction } from 'express';
import { fileService } from '../services/file.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const fileController = {
  async downloadInvoiceStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoiceId = req.params.invoiceId;
      const requestingShopId = req.user?.shopId || '';
      const userRole = req.user?.role || '';

      const { filename, content } = await fileService.generateInvoiceStatement(
        invoiceId,
        requestingShopId,
        userRole
      );

      // Enforce safe download headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).send(content);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async uploadShopDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shopId = req.user?.role === 'SHOP' && req.user.shopId ? req.user.shopId : req.body.shopId;
      const userId = req.user!.id;
      const { documentType = 'COMPLIANCE', filename = 'document.pdf', mimeType = 'application/pdf', fileData } = req.body;

      if (!fileData) {
        sendError(res, 'Missing base64 file data payload', 400);
        return;
      }

      const buffer = Buffer.from(fileData, 'base64');

      const doc = await fileService.uploadShopDocument({
        shopId,
        userId,
        documentType,
        originalFilename: filename,
        mimeType,
        buffer,
        ipAddress: req.ip,
      });

      sendSuccess(res, doc, 'Document securely uploaded and registered', 201);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async getShopDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const requestingShopId = req.user?.shopId || '';
      const userRole = req.user?.role || '';

      const { metadata, filePath } = await fileService.getShopDocument(
        documentId,
        requestingShopId,
        userRole
      );

      res.setHeader('Content-Type', metadata.mime_type);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${metadata.original_filename}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-transform, max-age=0');

      res.sendFile(filePath);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },
};
