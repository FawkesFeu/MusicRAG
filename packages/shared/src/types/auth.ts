export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublicProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserPublicProfile;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}
