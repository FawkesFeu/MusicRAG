import { db } from '../db/client.js';
import { users, sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { localStore } from '../db/local-store.js';
import type { UserRole } from '@rag/shared';

export interface CreateUserData {
  email: string;
  hashedPassword: string;
  name: string;
  role?: UserRole;
}

export const userRepository = {
  async findByEmail(email: string) {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findUserByEmail(email);
    }
  },

  async findById(id: string) {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findUserById(id);
    }
  },

  async create(data: CreateUserData) {
    try {
      const result = await db.insert(users).values({
        email: data.email,
        hashedPassword: data.hashedPassword,
        name: data.name,
        role: data.role || 'user',
      }).returning();
      return result[0];
    } catch {
      return localStore.createUser(data);
    }
  },

  async createSession(userId: string, refreshToken: string, expiresAt: Date) {
    try {
      const result = await db.insert(sessions).values({
        userId,
        refreshToken,
        expiresAt,
      }).returning();
      return result[0];
    } catch {
      return localStore.createSession(userId, refreshToken, expiresAt);
    }
  },

  async findSession(refreshToken: string) {
    try {
      const result = await db.select().from(sessions).where(eq(sessions.refreshToken, refreshToken)).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findSession(refreshToken);
    }
  },

  async deleteSession(refreshToken: string) {
    try {
      await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
    } catch {
      localStore.deleteSession(refreshToken);
    }
  },

  async listAll() {
    try {
      return await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      }).from(users);
    } catch {
      return localStore.listUsers();
    }
  },
};
