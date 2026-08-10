import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import type { JWTPayload, UserPublicProfile, AuthTokens, UserRole } from '@rag/shared';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;

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

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    const isValid = await this.comparePassword(password, user.hashedPassword);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const { token: refreshToken, expiresAt } = this.generateRefreshToken(user.id);
    await userRepository.createSession(user.id, refreshToken, expiresAt);

    const userProfile: UserPublicProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };

    return { accessToken, refreshToken, user: userProfile };
  },

  async register(name: string, email: string, password: string, role: UserRole = 'user'): Promise<AuthTokens> {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('Email is already registered');
    }

    const hashedPassword = await this.hashPassword(password);
    const user = await userRepository.create({
      name,
      email,
      hashedPassword,
      role,
    });

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const { token: refreshToken, expiresAt } = this.generateRefreshToken(user.id);
    await userRepository.createSession(user.id, refreshToken, expiresAt);

    const userProfile: UserPublicProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };

    return { accessToken, refreshToken, user: userProfile };
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = this.verifyRefreshToken(refreshToken);
    const session = await userRepository.findSession(refreshToken);
    if (!session || new Date() > new Date(session.expiresAt)) {
      throw new Error('Refresh token expired or invalid');
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
  },

  async logout(refreshToken: string): Promise<void> {
    await userRepository.deleteSession(refreshToken);
  },
};
