// Imports
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';

// Configuration
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';


// AuthService Class
export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(payload: { id: string; email: string; role: UserRole }): string {
    // @ts-ignore
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): any {
    // @ts-ignore
    return jwt.verify(token, JWT_SECRET);
  }

  static async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    churchId?: string;
    isApproved?: boolean;
    phase?: string;
  }) {
    const hashedPassword = await this.hashPassword(userData.password);

    return prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || UserRole.APRENDIZ,
        churchId: userData.churchId || null,
        isApproved: userData.isApproved || false,
        phase: userData.phase || "1",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        churchId: true,
        avatar: true,
        phase: true,
        isApproved: true,
        createdAt: true,
      },
    });
  }

  static async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        church: true,
      },
    });
  }

  static async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        churchId: true,
        phase: true,
        isApproved: true,
        isActive: true,
        createdAt: true,
        church: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
    });
  }

  static async updateUserAvatar(userId: string, avatarUrl: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });
  }

  static async findUsers(options: {
    where?: any;
    skip?: number;
    take?: number;
    orderBy?: any;
  }) {
    return prisma.user.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy || { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  static async countUsers(where?: any) {
    return prisma.user.count({ where });
  }

  static async updateUser(userId: string, data: {
    name?: string;
    email?: string;
    isActive?: boolean;
  }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
