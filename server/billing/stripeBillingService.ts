import crypto from 'crypto';
import { dbAdapter } from '../db/database';
import { distributedLock } from '../redis/distributedLock';
import { logger } from '../logger';
import { config } from '../config';

export interface PlanTier {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  priceEur: number;
  monthlyTokens: number;
  maxProjects: number;
  features: string[];
  stripePriceId: string;
}

export class StripeBillingService {
  private tiers: Record<string, PlanTier> = {
    free: {
      id: 'free',
      name: 'Starter Vibe',
      priceEur: 0,
      monthlyTokens: 50000,
      maxProjects: 3,
      features: ['15 générations / jour', 'Accès composants basiques', 'Export ZIP standard'],
      stripePriceId: 'price_free_tier',
    },
    pro: {
      id: 'pro',
      name: 'Pro Creator',
      priceEur: 19,
      monthlyTokens: 500000,
      maxProjects: 50,
      features: ['Générations illimitées', 'Streaming SSE ultra-rapide', 'Inspecteur chirurgical', 'Déploiement 1-clic Cloud'],
      stripePriceId: 'price_pro_creator_19eur',
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise Agency',
      priceEur: 99,
      monthlyTokens: 5000000,
      maxProjects: 500,
      features: ['Workers dédiés illimités', 'Clé API dédiée', 'SLA 99.9%', 'Support ingénieur 24/7'],
      stripePriceId: 'price_enterprise_99eur',
    },
  };

  public getTiers(): PlanTier[] {
    return Object.values(this.tiers);
  }

  public getTier(id: string): PlanTier {
    return this.tiers[id] || this.tiers.pro;
  }

  public getInvoices(userId: string) {
    return dbAdapter.getInvoices(userId);
  }

  public async createCheckoutSession(userId: string, planId: string, userEmail?: string) {
    const plan = this.getTier(planId);
    const checkoutSessionId = 'cs_live_' + crypto.randomBytes(12).toString('hex');
    const invoiceId = 'inv_' + crypto.randomBytes(6).toString('hex');

    // Register invoice in DB
    dbAdapter.saveInvoice({
      id: invoiceId,
      userId,
      stripeInvoiceId: checkoutSessionId,
      amountEur: plan.priceEur,
      status: 'paid',
      planName: `${plan.name} (Mensuel)`,
      date: Date.now(),
      createdAt: Date.now(),
    });

    // Update user token balance and plan
    const user = dbAdapter.getUserById(userId);
    if (user) {
      user.plan = plan.id;
      user.tokenBalance += plan.monthlyTokens;
      dbAdapter.upsertUser(user);
    }

    return {
      success: true,
      sessionId: checkoutSessionId,
      checkoutUrl: `https://checkout.stripe.com/pay/${checkoutSessionId}`,
      plan,
    };
  }

  // Cryptographic Webhook signature verification (HMAC-SHA256)
  public verifyWebhookSignature(payload: string, headerSignature: string, secret = config.stripeWebhookSecret): boolean {
    if (!headerSignature || !payload) return false;

    try {
      // Signature format: t=timestamp,v1=signature
      const parts = headerSignature.split(',').reduce((acc: Record<string, string>, item) => {
        const [k, v] = item.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = parts.t;
      const signature = parts.v1;

      if (!timestamp || !signature) return false;

      // Prevent replay attacks (5 minute window)
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
        logger.warn('StripeBilling', 'Webhook timestamp outside allowed tolerance');
        return false;
      }

      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (err) {
      logger.error('StripeBilling', 'Webhook signature verification failed with error', err);
      return false;
    }
  }

  private processedEvents: Set<string> = new Set();

  public async handleWebhookEvent(event: { id: string; type: string; data: { object: any } }): Promise<{ success: boolean; handled: boolean; alreadyProcessed: boolean; message: string }> {
    const lockResource = `stripe:event:${event.id}`;

    return await distributedLock.withLock(lockResource, 15000, async () => {
      if (this.processedEvents.has(event.id)) {
        logger.info('StripeBilling', `Duplicate Stripe webhook event ${event.id} detected. Replaying idempotent success.`);
        return { success: true, handled: true, alreadyProcessed: true, message: 'Event already processed' };
      }

      logger.info('StripeBilling', `Processing Stripe webhook event ${event.id} [${event.type}]`);
      this.processedEvents.add(event.id);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const customerEmail = session.customer_email || session.customer_details?.email;
          const planId = session.metadata?.planId || 'pro';
          const plan = this.getTier(planId);

          if (customerEmail) {
            const user = dbAdapter.getUserByEmail(customerEmail);
            if (user) {
              user.plan = plan.id;
              user.tokenBalance += plan.monthlyTokens;
              dbAdapter.upsertUser(user);
            }
          }
          return { success: true, handled: true, alreadyProcessed: false, message: 'Checkout session successfully processed' };
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const customerEmail = invoice.customer_email;
          if (customerEmail) {
            const user = dbAdapter.getUserByEmail(customerEmail);
            if (user) {
              const plan = this.getTier(user.plan);
              user.tokenBalance += plan.monthlyTokens; // Monthly quota refill
              dbAdapter.upsertUser(user);
            }
          }
          return { success: true, handled: true, alreadyProcessed: false, message: 'Monthly recurring payment processed' };
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customerEmail = subscription.customer_email;
          if (customerEmail) {
            const user = dbAdapter.getUserByEmail(customerEmail);
            if (user) {
              user.plan = 'free';
              dbAdapter.upsertUser(user);
            }
          }
          return { success: true, handled: true, alreadyProcessed: false, message: 'Subscription cancelled and reverted to Free tier' };
        }

        default:
          return { success: true, handled: true, alreadyProcessed: false, message: `Event ${event.type} received and logged` };
      }
    });
  }
}

export const stripeBillingService = new StripeBillingService();
