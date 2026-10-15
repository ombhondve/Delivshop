import { Request, Response, NextFunction } from 'express';
import { companyService } from '../services/company.service.js';
import { sendSuccess } from '../utils/response.js';
import { CompanyFilterParams } from '../types/company.types.js';

export const companyController = {
  async createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await companyService.createCompany(req.body, req.user?.id, req.ip);
      sendSuccess(res, result, 'Company created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async listCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: CompanyFilterParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        search: req.query.search as string,
        status: req.query.status as any,
        companyType: req.query.companyType as any,
        city: req.query.city as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await companyService.listCompanies(params);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getSummaryStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await companyService.getSummaryStats();
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  },

  async getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await companyService.getCompany(req.params.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await companyService.updateCompany(
        req.params.id,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result, 'Company updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateCompanyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, reason } = req.body;
      const result = await companyService.updateStatus(
        req.params.id,
        status,
        reason,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result, `Company status successfully updated to ${status}`);
    } catch (err) {
      next(err);
    }
  },

  async deleteCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reason = req.body?.reason || (req.query.reason as string) || undefined;
      const result = await companyService.deleteCompany(
        req.params.id,
        req.user?.id,
        req.ip,
        reason
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },
};
