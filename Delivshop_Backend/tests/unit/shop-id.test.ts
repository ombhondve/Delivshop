import { describe, it, expect, vi } from 'vitest';
import {
  generateShopId,
  getBusinessDateParts,
  ShopIdLimitExceededError,
} from '../../src/services/shop-id.service.js';

describe('Shop ID Generation & Business Rules', () => {
  it('should format date in business timezone (Asia/Kolkata)', () => {
    // 2026-10-14T05:55:00Z is 2026-10-14 11:25:00 IST
    const testDate = new Date('2026-10-14T05:55:00.000Z');
    const { dateKey, sqlDate } = getBusinessDateParts(testDate, 'Asia/Kolkata');

    expect(dateKey).toBe('20261014');
    expect(sqlDate).toBe('2026-10-14');
  });

  it('should produce Shop ID with YYYYMMDDNNN format and 3-digit zero padding', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [{ last_sequence: 1 }],
      }),
    };

    const result = await generateShopId(mockClient as any, new Date('2026-10-14T05:55:00.000Z'));
    expect(result.shopId).toBe('20261014001');
    expect(result.sequenceNumber).toBe(1);
    expect(result.registrationDate).toBe('2026-10-14');
  });

  it('should pad sequences correctly up to 999', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [{ last_sequence: 42 }],
      }),
    };

    const result = await generateShopId(mockClient as any, new Date('2026-10-14T05:55:00.000Z'));
    expect(result.shopId).toBe('20261014042');
  });

  it('should throw ShopIdLimitExceededError when daily limit of 999 is exceeded', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [{ last_sequence: 1000 }],
      }),
    };

    await expect(
      generateShopId(mockClient as any, new Date('2026-10-14T05:55:00.000Z'))
    ).rejects.toThrow(ShopIdLimitExceededError);
  });
});
