import { hardenedSecurityShield } from './security/hardenedSecurityShield';

export interface SecurityIncident {
  id: string;
  type: 'xss_attempt' | 'prompt_injection' | 'rate_limit_spike' | 'suspicious_payload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  ip: string;
  timestamp: number;
}

class SecurityShieldBridge {
  public sanitizePrompt(prompt: string, ip: string): { safe: boolean; sanitized: string; warning?: string } {
    return hardenedSecurityShield.sanitizePrompt(prompt, ip);
  }

  public getIncidents() {
    return hardenedSecurityShield.getSecurityHealth().recentIncidents;
  }

  public getSecurityHealth() {
    return hardenedSecurityShield.getSecurityHealth();
  }
}

export const securityShield = new SecurityShieldBridge();
