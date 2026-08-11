import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, adminCreateUserSchema, searchRequestSchema } from './index.js';

describe('Shared Zod Schemas & Security Validation', () => {
  it('validates correct login data', () => {
    const valid = { email: 'test@example.com', password: 'ValidPassword123!' };
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid or disposable emails', () => {
    expect(loginSchema.safeParse({ email: 'invalid-email', password: 'Pass123!Password' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'user@mailinator.com', password: 'Pass123!Password' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'user@tempmail.com', password: 'Pass123!Password' }).success).toBe(false);
  });

  it('enforces strong password policy (min 8 chars, uppercase, lowercase, number, symbol)', () => {
    // Valid password
    expect(registerSchema.safeParse({ name: 'Dev', email: 'dev@example.com', password: 'SecurePassword123!' }).success).toBe(true);

    // Weak passwords
    expect(registerSchema.safeParse({ name: 'Dev', email: 'dev@example.com', password: 'short' }).success).toBe(false); // too short
    expect(registerSchema.safeParse({ name: 'Dev', email: 'dev@example.com', password: 'alllowercase123!' }).success).toBe(false); // no uppercase
    expect(registerSchema.safeParse({ name: 'Dev', email: 'dev@example.com', password: 'ALLUPPERCASE123!' }).success).toBe(false); // no lowercase
    expect(registerSchema.safeParse({ name: 'Dev', email: 'dev@example.com', password: 'NoNumberSpecial!' }).success).toBe(false); // no number
    expect(registerSchema.safeParse({ name: 'Dev', email: 'dev@example.com', password: 'NoSpecialSymbol123' }).success).toBe(false); // no symbol
  });

  it('validates admin user creation with role', () => {
    const validAdmin = { name: 'Admin', email: 'admin@studio.com', password: 'AdminPassword123!', role: 'admin' };
    const parsed = adminCreateUserSchema.parse(validAdmin);
    expect(parsed.role).toBe('admin');
  });

  it('validates search request with defaults', () => {
    const valid = { query: 'How to initialize SDK?' };
    const parsed = searchRequestSchema.parse(valid);
    expect(parsed.topK).toBe(5);
    expect(parsed.generateAnswer).toBe(true);
  });
});
