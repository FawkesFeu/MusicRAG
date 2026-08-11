import { db } from '../db/client.js';
import { invitations } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { localStore } from '../db/local-store.js';
import type { UserRole } from '@rag/shared';

export interface CreateInvitationData {
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  createdBy?: string | null;
}

export const invitationRepository = {
  async create(data: CreateInvitationData) {
    try {
      const result = await db.insert(invitations).values({
        email: data.email,
        role: data.role,
        token: data.token,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy || null,
        used: false,
      }).returning();
      return result[0];
    } catch {
      return localStore.createInvitation(data);
    }
  },

  async findByToken(token: string) {
    try {
      const result = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findInvitationByToken(token);
    }
  },

  async listAll() {
    try {
      const rows = await db.select().from(invitations).orderBy(desc(invitations.createdAt));
      return rows.map((r) => ({
        ...r,
        role: r.role as UserRole,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }));
    } catch {
      return localStore.listInvitations();
    }
  },

  async markUsed(token: string) {
    try {
      const result = await db.update(invitations).set({
        used: true,
      }).where(eq(invitations.token, token)).returning();
      return result[0] || null;
    } catch {
      return localStore.markInvitationUsed(token);
    }
  },

  async delete(id: string) {
    try {
      await db.delete(invitations).where(eq(invitations.id, id));
    } catch {
      localStore.deleteInvitation(id);
    }
  },
};
