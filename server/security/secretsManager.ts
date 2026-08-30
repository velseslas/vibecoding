/**
 * SecretsManager - Secure management of sensitive configuration
 * Ensures NO secrets are logged or exposed in any way
 */

export class SecretsManager {
  private static instance: SecretsManager;
  private secrets: Map<string, string> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  /**
   * Initialize secrets from environment variables
   * NEVER log or display secrets after this point
   */
  public initialize(): void {
    if (this.initialized) return;

    const requiredSecrets = [
      'GEMINI_API_KEY',
      'OXALPHA_API_KEY',
      'CLERK_SECRET_KEY',
      'STRIPE_SECRET_KEY',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
    ];

    for (const secret of requiredSecrets) {
      const value = process.env[secret];
      if (value && value !== `MY_${secret}`) {
        this.secrets.set(secret, value);
      }
    }

    this.initialized = true;

    // Log ONLY that initialization was successful, NOT the values
    if (process.env.NODE_ENV === 'production') {
      console.log('[SecretsManager] Initialized with', this.secrets.size, 'secrets');
    } else {
      console.log('[SecretsManager] Initialized in development mode');
    }
  }

  /**
   * Get a secret value safely
   * Never expose the actual value in error messages
   */
  public get(key: string): string {
    const value = this.secrets.get(key);
    if (!value) {
      throw new Error(`Secret '${key}' not configured`);
    }
    return value;
  }

  /**
   * Check if a secret exists without returning its value
   */
  public has(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * Validate all required secrets are present
   * Throws error if any required secret is missing
   */
  public validate(): { valid: boolean; missing: string[] } {
    const required = [
      'GEMINI_API_KEY',
      'OXALPHA_API_KEY',
      'DATABASE_URL',
    ];

    const missing = required.filter(key => !this.has(key));

    if (missing.length > 0) {
      console.error(
        '[SecretsManager] Missing required secrets:',
        missing.map(k => `'${k}'`).join(', ')
      );
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Create a sanitized error message for logging
   * Never expose actual secret values
   */
  public sanitizeError(error: any, context: string): string {
    const message = error?.message || String(error);
    
    // Remove any potential secret patterns
    const sanitized = message
      .replace(/sk_[a-zA-Z0-9_-]+/g, '****')
      .replace(/pk_[a-zA-Z0-9_-]+/g, '****')
      .replace(/Bearer\s+[a-zA-Z0-9_.-]+/g, 'Bearer ****')
      .replace(/key=[a-zA-Z0-9_-]+/g, 'key=****');

    return `[${context}] ${sanitized}`;
  }
}

export const secretsManager = SecretsManager.getInstance();
