import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, searchRequestSchema } from './index.js';

describe('Shared Zod Schemas', () => {
  it('validates correct login data', () => {
    const valid = { email: 'test@example.com', password: 'password123' };
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid email for login', () => {
    const invalid = { email: 'invalid-email', password: 'password123' };
    expect(loginSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates register schema with default role', () => {
    const valid = { name: 'Baran', email: 'baran@example.com', password: 'secretpassword' };
    const parsed = registerSchema.parse(valid);
    expect(parsed.role).toBe('user');
  });

  it('validates search request with defaults', () => {
    const valid = { query: 'How to initialize SDK?' };
    const parsed = searchRequestSchema.parse(valid);
    expect(parsed.topK).toBe(5);
    expect(parsed.generateAnswer).toBe(true);
  });
});
