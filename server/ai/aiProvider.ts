export type ProviderTaskType =
  | 'CONVERSATION'
  | 'CODE_GENERATION'
  | 'AUTO_REPAIR'
  | 'ANALYSIS'
  | 'DESIGN_AUDIT'
  | 'STREAMING';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIProviderRequest {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  timeoutMs?: number;
  taskType?: ProviderTaskType;
  metadata?: Record<string, any>;
}

export interface AIProviderResponse {
  text: string;
  rawResponse?: any;
  usage: TokenUsage;
  durationMs: number;
  model: string;
  provider: string;
  finishReason?: string;
  estimatedCostEur?: number;
}

export interface AIStructuredRequest<T> extends AIProviderRequest {
  schema?: Record<string, any>;
  validator?: (data: any) => data is T;
}

export interface AIStructuredResponse<T> {
  data: T;
  rawText: string;
  usage: TokenUsage;
  durationMs: number;
  model: string;
  provider: string;
  estimatedCostEur?: number;
  validated: boolean;
}

export interface ProviderMetadata {
  id: string; // e.g. 'gemini', 'oxalpha', 'local_engine'
  name: string; // e.g. 'Google Gemini', 'OxAlpha AI', 'Local Synthesizer'
  type: 'cloud' | 'custom' | 'local';
  models: string[];
  defaultModel: string;
  isAvailable: boolean;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  supportsStreaming: boolean;
  supportsStructuredOutput: boolean;
}

export type ConnectionTestStatus =
  | 'SUCCESS'
  | 'UNAVAILABLE'
  | 'INVALID_AUTH'
  | 'TIMEOUT'
  | 'QUOTA_EXCEEDED'
  | 'PROVIDER_ERROR';

export interface ProviderConnectionTestResult {
  success: boolean;
  status: ConnectionTestStatus;
  statusLabel: string;
  message: string;
  latencyMs: number;
  provider: string;
  model?: string;
  timestamp: number;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Generates standard text response
   */
  generateText(request: AIProviderRequest): Promise<AIProviderResponse>;

  /**
   * Generates validated structured JSON response
   */
  generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResponse<T>>;

  /**
   * Generates stream response via SSE/chunk callback
   */
  streamGenerate?(
    request: AIProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIProviderResponse>;

  /**
   * Returns provider metadata & availability status
   */
  getMetadata(): ProviderMetadata;

  /**
   * Checks if the provider has configured credentials & passes basic availability checks
   */
  isAvailable(): boolean;

  /**
   * Performs real server-side connection test without exposing secrets
   */
  testConnection?(): Promise<ProviderConnectionTestResult>;

  /**
   * Computes estimated cost in EUR for token count
   */
  estimateCost(usage: TokenUsage): number;
}
