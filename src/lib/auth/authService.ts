import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import OAuth2Server from 'oauth2-server';
import type { User as OAuthUser, Client, Token, AuthorizationCode, PasswordModel } from 'oauth2-server';
import { PrismaClient } from '@prisma/client';
import { MetricsCollector } from '../metricsCollector.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from './sessionManager.js';

const metricsCollector = MetricsCollector.getInstance();
const { Request: OAuthRequest, Response: OAuthResponse } = OAuth2Server;

enum UserRole {
  ADMIN = 'ADMIN',
  TECH = 'TECH',
  USER = 'USER'
}

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
};

interface AuthToken extends Token {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresAt: Date;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  sessionToken: string;
}

declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}

export class AuthService {
  private oauth: OAuth2Server;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.oauth = new OAuth2Server({
      model: {
        getClient: async (clientId: string, clientSecret: string) => {
          return { id: 'internal_client', grants: ['password'] } as Client;
        },
        saveToken: async (token: AuthToken, client: Client, user: AuthUser) => {
          const authToken = {
            ...token,
            user,
            client,
            accessToken: token.accessToken,
            accessTokenExpiresAt: token.accessTokenExpiresAt
          };
          return authToken;
        },
        getUser: async (email: string, password: string) => {
          const result = await this.prisma.$queryRaw<Array<any>>`
            SELECT * FROM "User" WHERE email = ${email}
          `;
          if (!result[0]) return null;
          
          const user = result[0];
          const validPassword = await bcrypt.compare(password, user.password_hash);
          return validPassword ? user : null;
        },
        validateScope: async (user: OAuthUser, client: Client, scope: string) => {
          return (user as AuthUser).role === UserRole.ADMIN ? scope : undefined;
        },
        verifyScope: async (token: Token, scope: string) => {
          const result = await this.prisma.$queryRaw<Array<{role: UserRole}>>`
            SELECT role FROM "User" WHERE id = ${(token as AuthToken).user.id}
          `;
          return result[0]?.role === UserRole.ADMIN;
        },
        getAccessToken: async (accessToken: string) => {
          const result = await this.prisma.$queryRaw<Array<Token>>`
            SELECT * FROM "Token" WHERE access_token = ${accessToken}
          `;
          return result[0];
        }
      } as PasswordModel,
      accessTokenLifetime: 3600,
    });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const user = await this.prisma.$queryRaw<Array<AuthUser>>`
        SELECT * FROM "User" WHERE email = ${email}
      `;

      if (!user[0]) {
        throw new Error('Usuario no encontrado');
      }

      const validPassword = await bcrypt.compare(password, user[0].passwordHash);
      if (!validPassword) {
        throw new Error('Contraseña incorrecta');
      }

      // Generar token de sesión usando SessionManager
      const sessionToken = uuidv4();
      const sessionManager = new SessionManager();
      await sessionManager.createSession(user[0].id, sessionToken);

      await metricsCollector.recordSystemMetric('login_success', user[0].id);

      return {
        user: {
          id: user[0].id,
          email: user[0].email,
          role: user[0].role
        },
        sessionToken
      };
    } catch (error) {
      await metricsCollector.recordSystemMetric('login_failure', email);
      throw error;
    }
  }

  async validateSession(sessionToken: string): Promise<AuthUser | null> {
    if (!sessionToken) return null;
    
    try {
      const session = await this.prisma.$queryRaw<Array<any>>`
        SELECT 
          u.id,
          u.email,
          u.role,
          u.password_hash as "passwordHash"
        FROM "Session" s
        JOIN "User" u ON s.user_id = u.id
        WHERE s.token = ${sessionToken}
          AND s.expires_at > CURRENT_TIMESTAMP
          AND s.invalidated = false
        LIMIT 1
      `;

      const userData = session[0];
      if (!userData) return null;

      // Normalizar el rol
      const role = userData.role?.toUpperCase();
      if (!Object.values(UserRole).includes(role)) {
        console.error(`[AUTH] Rol inválido encontrado: ${role}`);
        return null;
      }

      return {
        id: userData.id,
        email: userData.email,
        role: role as UserRole,
        passwordHash: userData.passwordHash
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const result = await this.prisma.$queryRaw<Array<AuthUser>>`
        SELECT id, email, role, password_hash as "passwordHash"
        FROM "User"
        WHERE id = ${userId}
      `;

      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async logout(sessionToken: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "Session" WHERE token = ${sessionToken}
    `;
  }

  async authenticate(req: Request, res: Response, next: NextFunction) {
    const request = new OAuthRequest(req);
    const response = new OAuthResponse(res);

    try {
      const token = await this.oauth.authenticate(request, response);
      await metricsCollector.recordSystemMetric('auth_request', 'SUCCESS');
      req.user = (token as AuthToken).user;
      next();
    } catch (error) {
      await metricsCollector.recordSystemMetric('auth_request', 'FAILURE');
      res.status(401).json({ error: 'Unauthorized' });
    }
  }

  checkRole(roles: UserRole[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!roles.includes(req.user?.role as UserRole)) {
        await metricsCollector.recordSystemMetric('authorization_failure', req.user?.id || 'unknown');
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    };
  }

  async createUser(userData: Omit<AuthUser, 'id'>) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.passwordHash, salt);

    return await this.prisma.$executeRaw`
      INSERT INTO "User" (email, role, password_hash)
      VALUES (${userData.email}, ${userData.role || UserRole.USER}, ${passwordHash})
      RETURNING *
    `;
  }
}

export const authService = new AuthService();
