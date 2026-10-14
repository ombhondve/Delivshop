import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';

describe('Security Token Utility', () => {
  it('should generate a verifiable JWT containing the role and user ID', () => {
    const mockUser: AuthUser = {
      id: 'usr-12345',
      email: 'shop@delivshop.local',
      role: 'SHOP',
      shopId: 'shop-987',
    };

    const token = generateAccessToken(mockUser);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe('SHOP');
    expect(decoded.shopId).toBe('shop-987');
  });
});
