import { z } from 'zod';

// Disallowed disposable / temp email domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'trashmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'yopmail.com',
]);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email is required')
  .max(255, 'Email is too long')
  .email('Invalid email address format')
  .refine((email) => {
    const domain = email.split('@')[1];
    return !DISPOSABLE_EMAIL_DOMAINS.has(domain);
  }, { message: 'Disposable or temporary email addresses are not allowed' });

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character (!@#$%^&*...)');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Public Registration - strictly assigns 'user' role
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: emailSchema,
  password: strongPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Admin Privileged User Creation
export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: emailSchema,
  password: strongPasswordSchema,
  role: z.enum(['user', 'admin']).default('user'),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

// Admin Role Update
export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Admin Invitation Creation Schema
export const createInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['user', 'admin']).default('user'),
  expiresInHours: z.number().int().min(1).max(720).default(48),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// Accept Invitation Schema
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: strongPasswordSchema,
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
