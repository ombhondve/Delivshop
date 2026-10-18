import readline from 'readline';
import { userRepository } from '../repositories/user.repository.js';
import { hashPassword } from '../utils/password.js';
import { auditService } from '../services/audit.service.js';
import { logger } from '../utils/logger.js';
import { dbPool, query } from '../config/database.js';

export interface ProvisionAdminOptions {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  forceReset?: boolean;
}

export interface ProvisionAdminResult {
  success: boolean;
  action: 'CREATED' | 'PRESERVED' | 'RESET' | 'FAILED';
  email: string;
  role: string;
  message: string;
}

/**
 * Validate password strength for administrative accounts according to OWASP guidelines:
 * - At least 10 characters in length
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special symbol
 * - Not a predictable dictionary word or dev credential
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 10) {
    return { valid: false, reason: 'Password must be at least 10 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter (A-Z)' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter (a-z)' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one numeric digit (0-9)' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special symbol (!@#$%^&*)' };
  }
  const prohibitedPasswords = ['admin123', 'admin1234', 'password123', 'admin', 'password', 'delivshop123', 'delivshop'];
  if (prohibitedPasswords.includes(password.toLowerCase())) {
    return { valid: false, reason: 'Predictable development or common default passwords are not allowed' };
  }
  return { valid: true };
}

/**
 * Basic email format verification
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Provision the initial administrative account.
 * 
 * Safety & Security Guarantees:
 * 1. Requires explicit email and strong password.
 * 2. Hashes password using Argon2id (OWASP recommended parameters).
 * 3. Never writes passwords to logs or responses.
 * 4. Idempotent: if an admin with the same email exists, preserves it without modifying the password.
 * 5. Does not touch or insert fake shop, customer, or order data.
 * 6. Records an audit event upon creation.
 */
export async function provisionAdmin(options: ProvisionAdminOptions): Promise<ProvisionAdminResult> {
  const email = options.email?.trim().toLowerCase();
  const password = options.password;
  const name = options.name?.trim() || 'System Administrator';
  const phone = options.phone?.trim();

  if (!email || !validateEmail(email)) {
    throw new Error('A valid email address is required.');
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new Error(`Password policy violation: ${strength.reason}`);
  }

  // Idempotent check: verify if account with this email already exists
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    if (options.forceReset) {
      const passwordHash = await hashPassword(password);
      await query(
        `UPDATE users SET password_hash = $1, is_active = TRUE, updated_at = NOW() WHERE id = $2`,
        [passwordHash, existingUser.id]
      );
      await auditService.log({
        actorId: existingUser.id,
        action: 'ADMIN_PASSWORD_RESET',
        entityType: 'user',
        entityId: existingUser.id,
        details: { email: existingUser.email, role: existingUser.role },
      });
      const resetMsg = `Administrator password successfully updated for "${existingUser.email}".`;
      logger.info(`[Admin Provisioning] ${resetMsg} (Role: ${existingUser.role})`);
      return {
        success: true,
        action: 'RESET',
        email: existingUser.email,
        role: existingUser.role,
        message: resetMsg,
      };
    }

    const msg = `Admin account with email "${email}" already exists. Preserving existing record and password without changes.`;
    logger.info(`[Admin Provisioning] ${msg} (Role: ${existingUser.role})`);
    return {
      success: true,
      action: 'PRESERVED',
      email: existingUser.email,
      role: existingUser.role,
      message: msg,
    };
  }

  // Hash password with Argon2id
  const passwordHash = await hashPassword(password);

  // Create admin user record
  const newUser = await userRepository.create({
    email,
    passwordHash,
    name,
    role: 'ADMIN',
    phone,
  });

  // Record audit trail
  await auditService.log({
    actorId: newUser.id,
    action: 'INITIAL_ADMIN_PROVISIONED',
    entityType: 'user',
    entityId: newUser.id,
    details: {
      email: newUser.email,
      role: newUser.role,
    },
  });

  const successMsg = `Administrator account successfully created for "${newUser.email}".`;
  logger.info(`[Admin Provisioning] ${successMsg} (Role: ${newUser.role})`);

  return {
    success: true,
    action: 'CREATED',
    email: newUser.email,
    role: newUser.role,
    message: successMsg,
  };
}

function parseCliArgs(): Partial<ProvisionAdminOptions> {
  const args = process.argv.slice(2);
  const options: Partial<ProvisionAdminOptions> = {};
  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      options.email = arg.substring('--email='.length);
    } else if (arg.startsWith('--password=')) {
      options.password = arg.substring('--password='.length);
    } else if (arg.startsWith('--name=')) {
      options.name = arg.substring('--name='.length);
    } else if (arg.startsWith('--phone=')) {
      options.phone = arg.substring('--phone='.length);
    } else if (arg === '--reset' || arg === '--force' || arg === '--force-reset') {
      options.forceReset = true;
    }
  }
  return options;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function runCli(): Promise<void> {
  const cliArgs = parseCliArgs();

  let email = cliArgs.email || process.env.ADMIN_EMAIL || process.env.PROVISION_ADMIN_EMAIL;
  let password = cliArgs.password || process.env.ADMIN_PASSWORD || process.env.PROVISION_ADMIN_PASSWORD;
  const name = cliArgs.name || process.env.ADMIN_NAME || process.env.PROVISION_ADMIN_NAME || 'System Administrator';
  const phone = cliArgs.phone || process.env.ADMIN_PHONE || process.env.PROVISION_ADMIN_PHONE;

  // If in interactive terminal and values are missing, prompt user securely
  if (!email && process.stdin.isTTY) {
    email = await prompt('Enter Admin Email: ');
  }
  if (!password && process.stdin.isTTY) {
    password = await prompt('Enter Admin Password (min 10 chars, uppercase, lowercase, number, symbol): ');
  }

  if (!email || !password) {
    console.error('❌ Error: Missing required credentials.');
    console.error('\nUsage:');
    console.error('  npm run admin:provision -- --email=<email> --password=<strong_password> [--name=<name>]');
    console.error('  OR set environment variables: ADMIN_EMAIL and ADMIN_PASSWORD');
    process.exit(1);
  }

  try {
    const result = await provisionAdmin({ email, password, name, phone, forceReset: cliArgs.forceReset });
    console.log(`\n✅ ${result.message}`);
    console.log(`Action: ${result.action}`);
    console.log(`Email:  ${result.email}`);
    console.log(`Role:   ${result.role}`);
    await dbPool.end();
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ Provisioning failed: ${err.message}`);
    try {
      await dbPool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1] && (process.argv[1].endsWith('provision-admin.ts') || process.argv[1].endsWith('provision-admin.js'))) {
  runCli();
}
