// Imports
import { Request } from 'express';
import { UserRole } from '@prisma/client';

export { UserRole };

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    avatar?: string | null;
    churchId?: string | null;
    phase?: string;
    isApproved?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    church?: {
      id: string;
      name: string;
      description: string | null;
    } | null;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}
