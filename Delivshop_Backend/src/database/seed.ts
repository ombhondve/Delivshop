import { ENV } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { hashPassword } from '../utils/password.js';
import { auditService } from '../services/audit.service.js';
import { logger } from '../utils/logger.js';

export interface SeedResult {
  created: boolean;
  email: string;
  role: string;
  message: string;
}

/**
 * Seed the initial system administrator account.
 * 
 * Safety & Security Policies:
 * 1. Default credentials (admin@gmail.com / admin123) are permitted ONLY in development/test/preview environments.
 * 2. In production, seeding predictable development passwords is strictly blocked unless explicitly authorized.
 * 3. Operation is completely idempotent: if the admin account already exists, it is preserved without modification.
 * 4. Passwords are never stored or logged in plaintext; they are hashed using Argon2id.
 */
export async function seedDatabase(): Promise<SeedResult> {
  const targetEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase().trim();
  const targetPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const targetName = process.env.SEED_ADMIN_NAME || 'System Administrator';

  // Production environment protection
  if (ENV.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    const errorMsg =
      '[SECURITY ERROR] Database seed aborted: Default development credentials (admin@gmail.com / admin123) are strictly prohibited in production. To initialize an admin in production, use a secure provisioning process or set ALLOW_PRODUCTION_SEED=true with strong custom credentials.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Check if admin user already exists (Idempotent check)
  const existingUser = await userRepository.findByEmail(targetEmail);
  if (existingUser) {
    const msg = `Admin account already exists. Preserving existing record.`;
    logger.info(`[DB Seed] ${msg} (Email: ${targetEmail}, Role: ${existingUser.role})`);
    return {
      created: false,
      email: targetEmail,
      role: existingUser.role,
      message: msg,
    };
  }

  // Hash password securely with Argon2id
  const passwordHash = await hashPassword(targetPassword);

  // Insert user with ADMIN role
  const newUser = await userRepository.create({
    email: targetEmail,
    passwordHash,
    name: targetName,
    role: 'ADMIN',
  });

  // Record audit log
  await auditService.log({
    actorId: newUser.id,
    action: 'INITIAL_ADMIN_SEEDED',
    entityType: 'user',
    entityId: newUser.id,
    details: {
      email: newUser.email,
      role: newUser.role,
      environment: ENV.NODE_ENV,
    },
  });

  const successMsg = `Administrator account successfully created.`;
  logger.info(`[DB Seed] ${successMsg} (Email: ${newUser.email}, Role: ${newUser.role})`);

  return {
    created: true,
    email: newUser.email,
    role: newUser.role,
    message: successMsg,
  };
}

// Auto-run if executed directly via CLI: npx tsx src/database/seed.ts
if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  seedDatabase()
    .then((result) => {
      console.log(`✅ [Database Seed] ${result.message} (Email: ${result.email}, Role: ${result.role})`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`❌ [Database Seed] Error:`, err.message);
      process.exit(1);
    });
}
