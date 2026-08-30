import { createClerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface UserSession {
  uid: string;
  clerkId: string;
  email: string;
  name: string;
  avatar: string;
  role: 'admin' | 'creator' | 'pro';
  plan: 'free' | 'pro' | 'enterprise';
  tokensRemaining: number;
  monthlyQuota: number;
  token?: string;
}

export const CLERK_ENABLED = process.env.CLERK_ENABLED === 'true';

const DEV_USER: UserSession = {
  uid: 'dev-user',
  clerkId: 'dev-user',
  name: 'Developer',
  email: 'dev@local',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Developer',
  role: 'creator',
  plan: 'pro',
  tokensRemaining: 500000,
  monthlyQuota: 500000,
};

const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';
const clerkClient = (CLERK_ENABLED && clerkSecretKey) ? createClerkClient({ secretKey: clerkSecretKey }) : null;

class AuthStore {
  /**
   * Returns user session according to CLERK_ENABLED flag:
   * - If CLERK_ENABLED === false (dev mode) -> returns fixed dev user without JWT validation.
   * - If CLERK_ENABLED === true -> validates with Clerk.
   */
  public async getUserByToken(token?: string): Promise<UserSession | null> {
    if (!CLERK_ENABLED) {
      return DEV_USER;
    }

    if (!token || !token.trim()) {
      return null;
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    if (!cleanToken) {
      return null;
    }

    try {
      if (clerkClient) {
        try {
          const decoded = await clerkClient.verifyToken(cleanToken);
          if (decoded && decoded.sub) {
            const clerkUserId = decoded.sub;
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkUserId}@user.vibecode`;
            const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0];
            const avatar = clerkUser.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
            
            return {
              uid: clerkUserId,
              clerkId: clerkUserId,
              email,
              name,
              avatar,
              role: 'creator',
              plan: 'pro',
              tokensRemaining: 500000,
              monthlyQuota: 500000,
              token: cleanToken,
            };
          }
        } catch (verifyErr: any) {
          logger.warn('ClerkAuth', `Clerk token verification failed: ${verifyErr.message}`);
        }
      }

      return null;
    } catch (err: any) {
      logger.error('ClerkAuth', `Failed to authenticate user by token: ${err.message}`);
      return null;
    }
  }

  public loginOrRegister(email: string, name?: string): { success: boolean; user: UserSession; token: string } {
    if (!CLERK_ENABLED) {
      return {
        success: true,
        user: DEV_USER,
        token: 'dev-token',
      };
    }

    const userId = `usr_${Buffer.from(email).toString('hex').slice(0, 12)}`;
    const user: UserSession = {
      uid: userId,
      clerkId: userId,
      email,
      name: name || email.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      role: 'creator',
      plan: 'pro',
      tokensRemaining: 500000,
      monthlyQuota: 500000,
    };

    return {
      success: true,
      user,
      token: `dev_${userId}`,
    };
  }
}

export const authStore = new AuthStore();

/**
 * requireAuth Express Middleware:
 * - If CLERK_ENABLED === false: No auth required, attaches DEV_USER and proceeds immediately.
 * - If CLERK_ENABLED === true: Enforces valid Clerk authentication.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!CLERK_ENABLED) {
    (req as any).user = DEV_USER;
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '') || (req.headers['x-clerk-auth-token'] as string);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentification requise. Veuillez vous connecter avec Clerk pour effectuer cette action.',
      code: 'UNAUTHORIZED',
    });
  }

  const user = await authStore.getUserByToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Session Clerk invalide ou expirée. Veuillez vous reconnecter.',
      code: 'INVALID_TOKEN',
    });
  }

  (req as any).user = user;
  next();
}

/**
 * optionalAuth Express Middleware:
 * - If CLERK_ENABLED === false: Attaches DEV_USER to req.user.
 * - If CLERK_ENABLED === true: Attaches user if token is valid.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  if (!CLERK_ENABLED) {
    (req as any).user = DEV_USER;
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '') || (req.headers['x-clerk-auth-token'] as string);

  if (token) {
    const user = await authStore.getUserByToken(token);
    if (user) {
      (req as any).user = user;
    }
  }
  next();
}
