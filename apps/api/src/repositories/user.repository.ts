import { db } from '../db/client.js';
import { users, sessions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { UserRole } from '@rag/shared';

export interface CreateUserData {
  email: string;
  hashedPassword: string;
  name: string;
  role?: UserRole;
}

export const userRepository = {
  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  },

  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  },

  async create(data: CreateUserData) {
    const result = await db.insert(users).values({
      email: data.email,
      hashedPassword: data.hashedPassword,
      name: data.name,
      role: data.role || 'user',
    }).returning();
    return result[0];
  },

  async createSession(userId: string, refreshToken: string, expiresAt: Date) {
    const result = await db.insert(sessions).values({
      userId,
      refreshToken,
      expiresAt,
    }).returning();
    return result[0];
  },

  async findSession(refreshToken: string) {
    const result = await db.select().from(sessions).where(eq(sessions.refreshToken, refreshToken)).limit(1);
    return result[0] || null;
  },

  async deleteSession(refreshToken: string) {
    await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
  },

  async listAll() {
    return db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users);
  },
};
