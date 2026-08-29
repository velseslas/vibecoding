import { stripeBillingService } from './billing/stripeBillingService';

export interface SubscriptionTier {
  id: string;
  name: string;
  priceEur: number;
  monthlyTokens: number;
  maxProjects: number;
  features: string[];
  stripePriceId: string;
}

export interface BillingInvoice {
  id: string;
  userId: string;
  amountEur: number;
  status: 'paid' | 'pending' | 'failed';
  date: number;
  pdfUrl?: string;
  planName: string;
}

class BillingServiceBridge {
  public getTiers(): SubscriptionTier[] {
    return stripeBillingService.getTiers();
  }

  public getInvoices(userId: string): BillingInvoice[] {
    const raw = stripeBillingService.getInvoices(userId);
    return raw.map((inv) => ({
      id: inv.id,
      userId: inv.userId,
      amountEur: inv.amountEur,
      status: inv.status,
      date: inv.date,
      planName: inv.planName,
    }));
  }

  public createCheckoutSession(userId: string, planId: string, email?: string) {
    return stripeBillingService.createCheckoutSession(userId, planId, email);
  }
}

export const billingService = new BillingServiceBridge();
