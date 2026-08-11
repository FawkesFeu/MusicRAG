import { db } from '../db/client.js';
import { users, sessions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
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
      const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findUserByEmail(email.toLowerCase().trim());
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
        email: data.email.toLowerCase().trim(),
        hashedPassword: data.hashedPassword,
        name: data.name.trim(),
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

  async deleteUserSessions(userId: string) {
    try {
      await db.delete(sessions).where(eq(sessions.userId, userId));
    } catch {
      // In-memory cleanup
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

  async updateRole(id: string, role: UserRole) {
    try {
      const result = await db.update(users).set({ role }).where(eq(users.id, id)).returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });
      return result[0] || null;
    } catch {
      return localStore.updateUserRole(id, role);
    }
  },

  async deleteUser(id: string) {
    try {
      await db.delete(sessions).where(eq(sessions.userId, id));
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch {
      return localStore.deleteUser(id);
    }
  },

  async countAdmins(): Promise<number> {
    try {
      const all = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
      return all.length;
    } catch {
      const all = await localStore.listUsers();
      return all.filter((u: any) => u.role === 'admin').length;
    }
  },
};
