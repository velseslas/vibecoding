import { dbAdapter } from './db/database';
import { DbUser } from './db/schema';
import { logger } from './logger';

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  avatar: string;
  role: 'admin' | 'creator' | 'pro';
  plan: 'free' | 'pro' | 'enterprise';
  tokensRemaining: number;
  monthlyQuota: number;
  token?: string;
}

class EnterpriseAuthStore {
  private activeTokens: Map<string, string> = new Map(); // token -> userId

  public loginOrRegister(email: string, name?: string): { user: UserSession; token: string } {
    let user = dbAdapter.getUserByEmail(email);

    if (!user) {
      user = dbAdapter.upsertUser({
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        uid: 'usr_' + Math.random().toString(36).substring(2, 9),
        email,
        name: name || email.split('@')[0],
        role: 'creator',
        plan: 'pro',
        tokenBalance: 500000,
      });
      logger.info('Auth', `Registered new user ${email}`, undefined, { userId: user.id });
    }

    const token = 'vibe_auth_' + Buffer.from(`${user.id}:${Date.now()}:${Math.random()}`).toString('base64');
    this.activeTokens.set(token, user.id);

    return {
      user: this.toSession(user, token),
      token,
    };
  }

  public getUserByToken(token?: string): UserSession | null {
    if (!token) {
      // Default to admin profile for frictionless dev experience
      const admin = dbAdapter.getUserById('usr_admin_001') || dbAdapter.upsertUser({
        id: 'usr_admin_001',
        uid: 'usr_admin_001',
        email: 'noubaschool@gmail.com',
        name: 'Creator Studio Pro',
        role: 'admin',
        plan: 'pro',
        tokenBalance: 500000,
      });
      return this.toSession(admin, 'vibe_admin_token_default');
    }

    const userId = this.activeTokens.get(token);
    if (!userId) return null;

    const user = dbAdapter.getUserById(userId);
    if (!user) return null;

    return this.toSession(user, token);
  }

  private toSession(user: DbUser, token?: string): UserSession {
    return {
      uid: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`,
      role: user.role,
      plan: user.plan,
      tokensRemaining: user.tokenBalance,
      monthlyQuota: user.plan === 'enterprise' ? 5000000 : user.plan === 'pro' ? 500000 : 50000,
      token,
    };
  }
}

export const authStore = new EnterpriseAuthStore();
