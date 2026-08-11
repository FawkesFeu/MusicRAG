import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import type { JWTPayload, UserPublicProfile, AuthTokens, UserRole } from '@rag/shared';

const SALT_ROUNDS = 12; // High-security bcrypt cost factor
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_DAYS = 7;

export function auditLog(event: string, meta: { userId?: string; email?: string; role?: string; ip?: string; details?: string }) {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] [${timestamp}] EVENT: ${event} | EMAIL: ${meta.email || 'N/A'} | USER_ID: ${meta.userId || 'N/A'} | ROLE: ${meta.role || 'N/A'} | IP: ${meta.ip || 'N/A'} | DETAILS: ${meta.details || 'N/A'}`);
}

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  generateAccessToken(payload: { userId: string; email: string; role: UserRole }): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  },

  generateRefreshToken(userId: string): { token: string; expiresAt: Date } {
    const token = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_DAYS}d` });
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    return { token, expiresAt };
  },

  verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  },

  verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
  },

  async login(email: string, password: string, ip?: string): Promise<AuthTokens> {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      auditLog('AUTH_LOGIN_FAILED', { email, ip, details: 'User not found or inactive' });
      throw new Error('Invalid email or password');
    }

    const isValid = await this.comparePassword(password, user.hashedPassword);
    if (!isValid) {
      auditLog('AUTH_LOGIN_FAILED', { email, userId: user.id, ip, details: 'Password mismatch' });
      throw new Error('Invalid email or password');
    }

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const { token: refreshToken, expiresAt } = this.generateRefreshToken(user.id);
    await userRepository.createSession(user.id, refreshToken, expiresAt);

    auditLog('AUTH_LOGIN_SUCCESS', { email: user.email, userId: user.id, role: user.role, ip });

    const userProfile: UserPublicProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };

    return { accessToken, refreshToken, user: userProfile };
  },

  /**
   * Public Registration: Strictly enforces role = 'user' (Privilege Escalation Prevention).
   */
  async register(name: string, email: string, password: string, ip?: string): Promise<AuthTokens> {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      auditLog('AUTH_REGISTER_FAILED', { email, ip, details: 'Email already exists' });
      throw new Error('An account with this email address already exists');
    }

    const hashedPassword = await this.hashPassword(password);
    const user = await userRepository.create({
      name,
      email,
      hashedPassword,
      role: 'user', // strictly standard user
    });

    auditLog('AUTH_REGISTER_SUCCESS', { email: user.email, userId: user.id, role: 'user', ip });

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: 'user',
    });

    const { token: refreshToken, expiresAt } = this.generateRefreshToken(user.id);
    await userRepository.createSession(user.id, refreshToken, expiresAt);

    const userProfile: UserPublicProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'user',
    };

    return { accessToken, refreshToken, user: userProfile };
  },

  /**
   * Admin Privileged User Creation: Allows authenticated admins to create admin or user accounts.
   */
  async adminCreateUser(adminUserId: string, name: string, email: string, password: string, role: UserRole, ip?: string): Promise<UserPublicProfile> {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    const hashedPassword = await this.hashPassword(password);
    const user = await userRepository.create({
      name,
      email,
      hashedPassword,
      role,
    });

    auditLog('ADMIN_USER_CREATED', { email: user.email, userId: user.id, role, ip, details: `Created by admin ${adminUserId}` });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };
  },

  /**
   * Admin Role Management: Promotes or demotes user role with last-admin guard.
   */
  async updateUserRole(adminUserId: string, targetUserId: string, newRole: UserRole, ip?: string): Promise<UserPublicProfile> {
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // If demoting an admin, ensure at least one other admin exists
    if (targetUser.role === 'admin' && newRole === 'user') {
      const adminCount = await userRepository.countAdmins();
      if (adminCount <= 1) {
        throw new Error('Cannot demote the only remaining administrator account.');
      }
    }

    const updated = await userRepository.updateRole(targetUserId, newRole);
    if (!updated) {
      throw new Error('Failed to update user role');
    }

    // Invalidate target user's active sessions so privilege change applies immediately
    await userRepository.deleteUserSessions(targetUserId);

    auditLog('ADMIN_ROLE_CHANGED', { email: updated.email, userId: targetUserId, role: newRole, ip, details: `Updated by admin ${adminUserId}` });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as UserRole,
    };
  },

  /**
   * Admin User Deletion with self-deletion and last-admin guards.
   */
  async deleteUser(adminUserId: string, targetUserId: string, ip?: string): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new Error('You cannot delete your own administrator account.');
    }

    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUser.role === 'admin') {
      const adminCount = await userRepository.countAdmins();
      if (adminCount <= 1) {
        throw new Error('Cannot delete the only remaining administrator account.');
      }
    }

    await userRepository.deleteUser(targetUserId);
    auditLog('ADMIN_USER_DELETED', { email: targetUser.email, userId: targetUserId, ip, details: `Deleted by admin ${adminUserId}` });
  },

  async listAllUsers(): Promise<UserPublicProfile[]> {
    const allUsers = await userRepository.listAll();
    return allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as UserRole,
    }));
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      const session = await userRepository.findSession(refreshToken);
      
      if (!session || new Date(session.expiresAt) < new Date()) {
        throw new Error('Invalid or expired refresh token');
      }

      const user = await userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
      });

      return { accessToken };
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  },

  async logout(refreshToken: string): Promise<void> {
    await userRepository.deleteSession(refreshToken);
  },
};
