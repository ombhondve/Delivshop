import { companyRepository, toCompanyDTO } from '../repositories/company.repository.js';
import { generateCompanyCode } from './company-code.service.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';
import {
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyFilterParams,
  CompanySummaryStats,
  CompanyStatus,
} from '../types/company.types.js';

export const companyService = {
  async createCompany(
    input: CreateCompanyInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<Company> {
    // 1. Verify company name uniqueness
    const nameExists = await companyRepository.existsByName(input.name);
    if (nameExists) {
      throw new AppError(`A company with the name "${input.name}" already exists`, 409);
    }

    // 2. Resolve or generate unique Company Code
    let companyCode = input.companyCode ? input.companyCode.trim().toUpperCase() : '';
    if (companyCode) {
      const codeExists = await companyRepository.existsByCode(companyCode);
      if (codeExists) {
        throw new AppError(`Company code "${companyCode}" is already in use by another company`, 409);
      }
    } else {
      companyCode = await generateCompanyCode();
    }

    // 3. Persist company record in database
    const record = await companyRepository.create(
      {
        ...input,
        companyCode,
      },
      actorId
    );

    // 4. Record audit event
    await auditService.log({
      actorId,
      action: 'COMPANY_CREATED',
      entityType: 'company',
      entityId: record.id,
      details: {
        companyCode: record.company_code,
        name: record.name,
        companyType: record.company_type,
        status: record.status,
      },
      ipAddress,
    });

    return toCompanyDTO(record, 0);
  },

  async listCompanies(params: CompanyFilterParams): Promise<{
    items: Company[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await companyRepository.list(params);
    return {
      items: result.items.map((row) => toCompanyDTO(row)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  },

  async getCompany(id: string): Promise<Company> {
    const record = await companyRepository.findById(id);
    if (!record) {
      throw new AppError(`Company with ID "${id}" was not found`, 404);
    }

    const productsCount = await companyRepository.getAssociatedProductsCount(id);
    return toCompanyDTO(record, productsCount);
  },

  async updateCompany(
    id: string,
    input: UpdateCompanyInput,
    actorId?: string,
    ipAddress?: string
  ): Promise<Company> {
    const existing = await companyRepository.findById(id);
    if (!existing) {
      throw new AppError(`Company with ID "${id}" was not found`, 404);
    }

    // Check name uniqueness if updated
    if (input.name && input.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameExists = await companyRepository.existsByName(input.name, id);
      if (nameExists) {
        throw new AppError(`Another company with the name "${input.name}" already exists`, 409);
      }
    }

    const updated = await companyRepository.update(id, input);
    if (!updated) {
      throw new AppError(`Failed to update company with ID "${id}"`, 500);
    }

    await auditService.log({
      actorId,
      action: 'COMPANY_UPDATED',
      entityType: 'company',
      entityId: id,
      details: {
        changedFields: Object.keys(input),
      },
      ipAddress,
    });

    const productsCount = await companyRepository.getAssociatedProductsCount(id);
    return toCompanyDTO(updated, productsCount);
  },

  async updateStatus(
    id: string,
    newStatus: CompanyStatus,
    reason?: string,
    actorId?: string,
    ipAddress?: string
  ): Promise<Company> {
    const existing = await companyRepository.findById(id);
    if (!existing) {
      throw new AppError(`Company with ID "${id}" was not found`, 404);
    }

    const previousStatus = existing.status;
    if (previousStatus === newStatus) {
      const productsCount = await companyRepository.getAssociatedProductsCount(id);
      return toCompanyDTO(existing, productsCount);
    }

    // Dependency check when deactivating: check products count
    let associatedProducts = 0;
    if (newStatus === 'INACTIVE') {
      associatedProducts = await companyRepository.getAssociatedProductsCount(id);
    }

    const updated = await companyRepository.updateStatus(id, newStatus);
    if (!updated) {
      throw new AppError(`Failed to update company status`, 500);
    }

    await auditService.log({
      actorId,
      action: 'COMPANY_STATUS_CHANGED',
      entityType: 'company',
      entityId: id,
      details: {
        fromStatus: previousStatus,
        toStatus: newStatus,
        reason: reason || null,
        activeProductsCount: associatedProducts,
      },
      ipAddress,
    });

    const productsCount = await companyRepository.getAssociatedProductsCount(id);
    return toCompanyDTO(updated, productsCount);
  },

  async getSummaryStats(): Promise<CompanySummaryStats> {
    return companyRepository.getSummaryStats();
  },
};
