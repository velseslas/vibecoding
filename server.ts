import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import { config } from "./server/config";
import { logger } from "./server/logger";
import { telemetry } from "./server/observability/telemetry";
import { idempotencyService } from "./server/idempotency/idempotencyService";
import { dbAdapter } from "./server/db/database";
import { redisClient } from "./server/redis/redisClient";
import { distributedJobQueue } from "./server/queue/distributedJobQueue";
import { hardenedSecurityShield } from "./server/security/hardenedSecurityShield";
import { sandboxService } from "./server/sandbox/sandboxExecutionService";
import { stripeBillingService } from "./server/billing/stripeBillingService";
import { projectIntelligence } from "./server/versioning/projectIntelligence";
import { prometheusExporter } from "./server/observability/prometheusExporter";
import { aiCircuitRegistry } from "./server/ai/circuitBreaker";
import { providerRegistry } from "./server/ai/providerRegistry";
import { oxalphaProvider } from "./server/ai/oxalphaProvider";
import { OPENAPI_SPEC, getSwaggerHtml } from "./server/docs/openApiSpec";
import { ALERT_RULES_DEFINITIONS } from "./server/observability/alertingRules";
import { conversationEngine } from "./server/conversation/conversationEngine";
import { validatedArtifactEngine } from "./server/artifacts/validatedArtifact";
import { previewLifecycleService } from "./server/preview/previewLifecycle";
import { appDnaService } from "./server/analysis/appDna";
import { projectMemoryService } from "./server/memory/projectMemory";
import { appMapService } from "./server/analysis/appMap";
import { qualityMetricsTracker } from "./server/learning/qualityMetrics";
import { qualityEngine } from "./server/quality/qualityEngine";
import { visualIntelligenceService } from "./server/visual/visualIntelligence";
import { visualCaptureEngine, STANDARD_VIEWPORTS } from "./server/visual/visualCapture";
import { designAuditEngine } from "./server/audit/designAuditEngine";
import { productObservabilityService } from "./server/observability/productObservability";
import { realProductGenerationBenchmarkRunner } from "./server/tests/realProductGenerationBenchmark";

import { rateLimiter, conversationRateLimiter, generationRateLimiter, apiGeneralRateLimiter } from "./server/rateLimiter";
import { validateBody, conversationMessageSchema, generateAppSchema, iterateAppSchema } from "./server/validation/schemas";
import { statsTracker } from "./server/statsTracker";
import { projectStore } from "./server/projectStore";
import { buildIframeHtml, extractFilesFromHtml } from "./server/preview/buildIframeHtml";
import { authStore, requireAuth, optionalAuth } from "./server/authStore";
import { jobQueue } from "./server/jobQueue";
import { billingService } from "./server/billingService";
import { securityShield } from "./server/securityShield";
import helmet from "helmet";
import cors from "cors";

dotenv.config();

const CLERK_ENABLED = process.env.CLERK_ENABLED === "true";
logger.info("Auth", `Clerk Auth Status: ${CLERK_ENABLED ? "ENABLED (Production mode)" : "DISABLED (Development mode - single dev user)"}`);

const app = express();
const PORT = 3000;

// 1. Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false,
  })
);

// 2. CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// 3. Raw body parser for Stripe Webhook signature verification
app.use(
  express.json({
    limit: "15mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// 4. Correlation & Observability Middleware (X-Request-Id)
app.use(telemetry.middleware());

// Helper for Client IP
function getClientId(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress || "anonymous";
  return ip;
}

// 2. Enterprise WAF & Security Sanitization Middleware
app.use((req, res, next) => {
  if (req.method === "POST" && req.body && typeof req.body.prompt === "string") {
    const ip = getClientId(req);
    const userId = (req as any).user?.id || "usr_admin_001";
    const check = hardenedSecurityShield.sanitizePrompt(req.body.prompt, ip, userId);
    
    if (!check.safe) {
      return res.status(400).json({ success: false, error: check.warning || "Prompt bloqué par le pare-feu de sécurité." });
    }
    
    req.body.prompt = check.sanitized;
    if (check.warning) {
      res.setHeader("X-Security-Warning", check.warning);
    }
  }
  next();
});

// 3. Idempotency Middleware (X-Idempotency-Key)
app.use(idempotencyService.middleware());

// 4. Rate Limiting Middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/generate") || req.path.startsWith("/api/iterate") || req.path.startsWith("/api/stream")) {
    const clientId = getClientId(req);
    const limitCheck = rateLimiter.checkLimit(clientId);
    
    res.setHeader("X-RateLimit-Remaining", limitCheck.remaining.toString());
    res.setHeader("X-RateLimit-Reset", limitCheck.resetSeconds.toString());

    if (!limitCheck.allowed) {
      statsTracker.recordError();
      return res.status(429).json({
        success: false,
        error: "Trop de requêtes. Veuillez patienter quelques secondes avant de relancer une génération.",
        retryAfter: limitCheck.resetSeconds,
      });
    }
  }
  next();
});

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-enterprise",
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// Production Health Checks & Readiness Probes
// ----------------------------------------------------
app.get("/health/live", (_req, res) => {
  res.json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/health/ready", (_req, res) => {
  const dbHealth = dbAdapter.getDatabaseHealth();
  const redisHealth = redisClient.getHealth();
  const queueStats = distributedJobQueue.getStats();

  const isReady = dbHealth.status === "healthy" && redisHealth.status === "connected";

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "degraded",
    database: dbHealth,
    redis: redisHealth,
    queue: queueStats,
    aiAvailable: !!getGeminiClient(),
  });
});

// ----------------------------------------------------
// Prometheus Observability Exposition Metric Endpoint
// ----------------------------------------------------
app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(prometheusExporter.generateMetrics());
});

// ----------------------------------------------------
// OpenAPI 3.0 Documentation & Schema Endpoint
// ----------------------------------------------------
app.get("/api/openapi.json", (_req, res) => {
  res.json(OPENAPI_SPEC);
});

app.get("/api/docs", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(getSwaggerHtml());
});

// ----------------------------------------------------
// Realtime SSE Logs Stream Endpoint
// ----------------------------------------------------
app.get("/api/logs/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  // Prevent process crashes on socket errors
  res.on("error", () => {});
  req.on("error", () => {});

  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    unsubscribe();
    clearInterval(heartbeat);
  };

  const safeWrite = (data: string) => {
    if (closed || res.writableEnded || res.destroyed) return;
    try {
      res.write(data);
    } catch (err) {
      cleanup();
    }
  };

  // Initial connection message
  const initLog = {
    id: 'log-init-' + Date.now(),
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'Server',
    message: 'Connecté au flux SSE de logs serveur en temps réel',
  };
  safeWrite(`data: ${JSON.stringify(initLog)}\n\n`);

  // Stream recent log history
  const recent = logger.getRecentLogs();
  for (const item of recent) {
    safeWrite(`data: ${JSON.stringify(item)}\n\n`);
  }

  // Subscribe to live log emissions
  const unsubscribe = logger.subscribe((logItem) => {
    safeWrite(`data: ${JSON.stringify(logItem)}\n\n`);
  });

  // Send periodic heartbeat ping
  const heartbeat = setInterval(() => {
    safeWrite(`: ping\n\n`);
  }, 15000);

  req.on("close", cleanup);
  res.on("close", cleanup);
  res.on("finish", cleanup);
});

// ----------------------------------------------------
// Alerting Rules Catalog API
// ----------------------------------------------------
app.get("/api/alerts/rules", (_req, res) => {
  res.json({
    success: true,
    totalRules: ALERT_RULES_DEFINITIONS.length,
    rules: ALERT_RULES_DEFINITIONS,
  });
});

// ----------------------------------------------------
// AI Circuit Breakers Real-Time Status & Audit Logs
// ----------------------------------------------------
app.get("/api/circuit-breakers", (_req, res) => {
  res.json({
    success: true,
    ...aiCircuitRegistry.getAllStats(),
    recentFallbackAudits: aiCircuitRegistry.getAuditLogs(20),
  });
});

// Health check and Server Telemetry API (Legacy compatible)
app.get("/api/health", (_req, res) => {
  const stats = statsTracker.getSnapshot();
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY",
    ...stats,
  });
});

// Live Stats & Quota API
app.get("/api/stats", (req, res) => {
  const clientId = getClientId(req);
  const clientStats = rateLimiter.getClientStats(clientId);
  const serverStats = statsTracker.getSnapshot();
  res.json({
    success: true,
    userQuota: {
      remainingGenerations: clientStats.remaining,
      maxGenerations: clientStats.max,
      totalRequests: clientStats.totalRequests,
      totalTokens: clientStats.totalTokens,
      plan: "Pro Creator",
      speed: "120 tokens/sec",
    },
    system: serverStats,
  });
});

// ----------------------------------------------------
// Stripe Webhook Endpoint (Cryptographic Signature Check)
// ----------------------------------------------------
app.post("/api/billing/webhook", async (req: any, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (sig && !stripeBillingService.verifyWebhookSignature(rawBody, sig)) {
    logger.error("StripeWebhook", "Invalid webhook signature");
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }

  try {
    const result = await stripeBillingService.handleWebhookEvent(req.body);
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error("StripeWebhook", "Webhook handler error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Multi-Projects CRUD & Versioning API
// ----------------------------------------------------
app.get("/api/projects", (_req, res) => {
  res.json({ success: true, projects: projectStore.getAll() });
});

app.get("/api/projects/:id", (req, res) => {
  const project = projectStore.getById(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: "Projet non trouvé" });
  }
  res.json({ success: true, project });
});

app.post("/api/projects", (req, res) => {
  const saved = projectStore.saveProject(req.body);
  res.json({ success: true, project: saved });
});

app.post("/api/projects/:id/fork", (req, res) => {
  const forked = projectStore.forkProject(req.params.id, req.body.title);
  if (!forked) {
    return res.status(404).json({ success: false, error: "Projet source introuvable" });
  }
  res.json({ success: true, project: forked });
});

app.delete("/api/projects/:id", (req, res) => {
  const deleted = projectStore.deleteProject(req.params.id);
  res.json({ success: deleted });
});

// Version history & rollback
app.get("/api/projects/:id/versions", (req, res) => {
  const history = projectIntelligence.getHistory(req.params.id);
  res.json({ success: true, versions: history });
});

app.post("/api/projects/:id/rollback", (req, res) => {
  const { versionId } = req.body;
  if (!versionId) {
    return res.status(400).json({ success: false, error: "versionId requis" });
  }
  const restored = projectIntelligence.rollback(req.params.id, versionId);
  if (!restored) {
    return res.status(404).json({ success: false, error: "Version introuvable" });
  }
  res.json({ success: true, version: restored });
});

// ----------------------------------------------------
// Unified Vibecoding Conversation & Intelligence API
// ----------------------------------------------------
app.post("/api/conversation/message", conversationRateLimiter, validateBody(conversationMessageSchema), optionalAuth, async (req, res) => {
  try {
    const { projectId, prompt, vibe, currentHtml, files, confirmedByUser, rejectPlan, changesetId, rejectChangesetId, elementTarget } = req.body;
    if (!prompt && !rejectPlan && !changesetId && !rejectChangesetId) {
      return res.status(400).json({ success: false, error: "Prompt ou action requise" });
    }

    const user = (req as any).user || (await authStore.getUserByToken(req.headers.authorization?.replace("Bearer ", "")));
    const userId = user?.uid || `usr_creator_${getClientId(req).replace(/[^a-zA-Z0-9]/g, '')}`;

    const result = await conversationEngine.processUserMessage({
      projectId: projectId || "demo-saas-1",
      userId,
      prompt: prompt || "",
      vibe,
      currentHtml,
      files,
      confirmedByUser: !!confirmedByUser,
      rejectPlan: !!rejectPlan,
      changesetId,
      rejectChangesetId,
      elementTarget,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error("ConversationAPI", "Error processing conversation message", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Changesets & Decision Integrity APIs
app.get("/api/projects/:id/changesets", (req, res) => {
  const changesets = validatedArtifactEngine.getChangesetsByProject(req.params.id);
  res.json({ success: true, changesets });
});

app.get("/api/changesets/:id", (req, res) => {
  const changeset = validatedArtifactEngine.getChangeset(req.params.id);
  if (!changeset) {
    return res.status(404).json({ success: false, error: "Changeset introuvable" });
  }
  res.json({ success: true, changeset });
});

app.post("/api/changesets/:id/approve", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = await authStore.getUserByToken(token);
    const userId = user?.uid || "usr_admin_001";
    const approved = validatedArtifactEngine.approveChangeset(req.params.id, userId);
    res.json({ success: true, changeset: approved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/changesets/:id/reject", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = await authStore.getUserByToken(token);
    const userId = user?.uid || "usr_admin_001";
    const { reason } = req.body;
    const rejected = validatedArtifactEngine.rejectChangeset(req.params.id, userId, reason);
    res.json({ success: true, changeset: rejected });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/changesets/:id/apply", (req, res) => {
  try {
    const result = validatedArtifactEngine.applyChangeset(req.params.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Application DNA & Architecture Knowledge
app.get("/api/projects/:id/dna", (req, res) => {
  const dna = appDnaService.getOrCreateDna(req.params.id);
  res.json({ success: true, dna });
});

// Project Relational Map (Graph)
app.get("/api/projects/:id/map", (req, res) => {
  const versions = dbAdapter.getProjectVersions(req.params.id);
  const latestHtml = versions[versions.length - 1]?.htmlSnapshot || "";
  const graph = appMapService.buildMap(
    [{ name: "index.html", content: latestHtml }],
    latestHtml
  );
  res.json({ success: true, graph });
});

// Project Memory & Architectural Decisions
app.get("/api/projects/:id/memory", (req, res) => {
  const memory = projectMemoryService.getProjectMemory(req.params.id);
  res.json({ success: true, memory });
});

// Project Learning & Quality Metrics
app.get("/api/projects/:id/metrics", (req, res) => {
  const metrics = qualityMetricsTracker.getMetrics(req.params.id);
  res.json({ success: true, metrics });
});

// ----------------------------------------------------
// Preview Engine Lifecycle & Telemetry API
// ----------------------------------------------------
app.post("/api/preview/create", async (req, res) => {
  const { projectId, htmlContent, versionId } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await authStore.getUserByToken(token);

  const preview = previewLifecycleService.createPreviewSession({
    projectId: projectId || "demo-saas-1",
    versionId,
    userId: user?.uid || "usr_admin_001",
    htmlContent: htmlContent || "<!DOCTYPE html><html><body>App</body></html>",
  });

  res.json({ success: true, ...preview });
});

app.get("/api/preview/:id", (req, res) => {
  const session = previewLifecycleService.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, error: "Session de preview introuvable" });
  }
  res.json({ success: true, session });
});

app.post("/api/preview/error", (req, res) => {
  const { previewId, error } = req.body;
  if (!previewId || !error) {
    return res.status(400).json({ success: false, error: "previewId et error requis" });
  }

  const result = previewLifecycleService.recordRuntimeError(previewId, error);
  res.json({ success: true, ...result });
});

// ----------------------------------------------------
// Visual Intelligence & Multi-Viewport Capture API
// ----------------------------------------------------
app.post("/api/visual/audit", async (req, res) => {
  try {
    const { projectId, html, versionId, changesetId } = req.body;
    if (!html) {
      return res.status(400).json({ success: false, error: "Contenu HTML requis pour l'audit visuel" });
    }

    const report = await visualIntelligenceService.auditVisualRuntime(html, {
      projectId: projectId || "demo-saas-1",
      versionId,
      changesetId,
    });

    res.json({ success: true, report });
  } catch (err: any) {
    logger.error("VisualAPI", "Error running visual audit", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/visual/capture", (req, res) => {
  try {
    const { html, viewport, projectId } = req.body;
    if (!html) {
      return res.status(400).json({ success: false, error: "Contenu HTML requis pour la capture" });
    }

    const vpConfig = viewport === 'mobile' ? STANDARD_VIEWPORTS.mobile : STANDARD_VIEWPORTS.desktop;
    const capture = visualCaptureEngine.captureRender(html, vpConfig, { projectId });

    res.json({ success: true, capture });
  } catch (err: any) {
    logger.error("VisualAPI", "Error capturing visual render", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Quality & Design Harmony Audit APIs
// ----------------------------------------------------
app.post("/api/audit/app", (req, res) => {
  try {
    const { html, projectId, files } = req.body;
    const targetHtml = html || (projectId ? dbAdapter.getProjectVersions(projectId).slice(-1)[0]?.htmlSnapshot : "");
    const report = designAuditEngine.auditApplication(targetHtml || "", { projectId, files });
    res.json({ success: true, report });
  } catch (err: any) {
    logger.error("AuditAPI", "Error auditing application design", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/audit/page", (req, res) => {
  try {
    const { html, pageName, projectId } = req.body;
    const report = designAuditEngine.auditPage(pageName || "Page principale", html || "", projectId || "default_project");
    res.json({ success: true, report });
  } catch (err: any) {
    logger.error("AuditAPI", "Error auditing page design", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/audit/preflight", (req, res) => {
  try {
    const { html, projectId } = req.body;
    const pId = projectId || "default_project";
    const targetHtml = html || dbAdapter.getProjectVersions(pId).slice(-1)[0]?.htmlSnapshot || "";
    const report = designAuditEngine.auditPreflightPublish(pId, targetHtml);
    res.json({ success: true, report });
  } catch (err: any) {
    logger.error("AuditAPI", "Error running preflight publish audit", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// AI Providers & Multi-Model Orchestration API
// ----------------------------------------------------
app.get("/api/ai/providers", (_req, res) => {
  try {
    const summary = providerRegistry.getStatusSummary();
    res.json({ success: true, providers: summary });
  } catch (err: any) {
    logger.error("AIProviderAPI", "Error getting provider status", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/ai/providers/:providerId/config", (req, res) => {
  try {
    const { providerId } = req.params;
    const updates = req.body;
    // Security: Only allow updating safe operational params
    const safeUpdates: any = {};
    if (typeof updates.enabled === "boolean") safeUpdates.enabled = updates.enabled;
    if (typeof updates.priority === "number") safeUpdates.priority = updates.priority;
    if (typeof updates.temperature === "number") safeUpdates.temperature = updates.temperature;
    if (typeof updates.timeout === "number") safeUpdates.timeout = updates.timeout;
    if (typeof updates.model === "string") safeUpdates.model = updates.model;

    const updated = providerRegistry.updateConfig(providerId, safeUpdates);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    logger.error("AIProviderAPI", "Error updating provider config", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/ai/providers/:providerId/test", async (req, res) => {
  try {
    const { providerId } = req.params;
    const testResult = await providerRegistry.testProviderConnection(providerId);
    res.json({ success: true, result: testResult });
  } catch (err: any) {
    logger.error("AIProviderAPI", `Error testing provider ${req.params.providerId}`, err);
    res.status(500).json({
      success: false,
      result: {
        success: false,
        status: 'PROVIDER_ERROR',
        statusLabel: 'Erreur fournisseur',
        message: 'Erreur interne lors du test du fournisseur.',
        latencyMs: 0,
        provider: req.params.providerId,
        timestamp: Date.now(),
      },
    });
  }
});

app.get("/api/ai/observability/providers", (_req, res) => {
  try {
    const comparison = productObservabilityService.getProviderComparison();
    res.json({ success: true, providers: comparison });
  } catch (err: any) {
    logger.error("AIProviderAPI", "Error getting provider comparison", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Product Observability & Learning Metrics API
// ----------------------------------------------------
app.get("/api/observability/product-metrics", (req, res) => {
  try {
    const projectId = (req.query.projectId as string) || "demo-saas-1";
    const metrics = productObservabilityService.computeMetrics(projectId);
    res.json({ success: true, metrics });
  } catch (err: any) {
    logger.error("ObservabilityAPI", "Error fetching product metrics", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/observability/real-products", (_req, res) => {
  try {
    const traces = productObservabilityService.getRealProductTraces();
    res.json({ success: true, traces });
  } catch (err: any) {
    logger.error("ObservabilityAPI", "Error fetching real product traces", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/benchmark/real-product", async (_req, res) => {
  try {
    logger.info("BenchmarkAPI", "Triggering Real Product Generation Benchmark (Passe 2)...");
    const report = await realProductGenerationBenchmarkRunner.runFullBenchmark();
    res.json({ success: true, report });
  } catch (err: any) {
    logger.error("BenchmarkAPI", "Error running real product benchmark", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Authentication & User Session API
// ----------------------------------------------------
app.get("/api/auth/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = authStore.getUserByToken(token);
  res.json({ success: true, user });
});

app.post("/api/auth/login", (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email requis" });
  }
  const result = authStore.loginOrRegister(email, name);
  res.json({ success: true, ...result });
});

// ----------------------------------------------------
// Async Job Queue API (Worker Pool)
// ----------------------------------------------------
app.get("/api/jobs/stats", (_req, res) => {
  res.json({ success: true, stats: distributedJobQueue.getStats() });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = distributedJobQueue.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: "Job introuvable" });
  }
  res.json({ success: true, job });
});

app.post("/api/jobs/:id/cancel", (req, res) => {
  const cancelled = distributedJobQueue.cancelJob(req.params.id);
  res.json({ success: cancelled });
});

// ----------------------------------------------------
// Billing & Stripe Integration API
// ----------------------------------------------------
app.get("/api/billing/tiers", (_req, res) => {
  res.json({ success: true, tiers: billingService.getTiers() });
});

app.get("/api/billing/invoices", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await authStore.getUserByToken(token);
  const invoices = billingService.getInvoices(user?.uid || "usr_admin_001");
  res.json({ success: true, invoices });
});

app.post("/api/billing/checkout", async (req, res) => {
  const { planId, email } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await authStore.getUserByToken(token);
  const checkout = await billingService.createCheckoutSession(user?.uid || "usr_admin_001", planId || "pro", email || user?.email);
  res.json({ success: true, ...checkout });
});

// ----------------------------------------------------
// Security WAF & Audit Log API
// ----------------------------------------------------
app.get("/api/security/health", (_req, res) => {
  res.json({ success: true, ...hardenedSecurityShield.getSecurityHealth() });
});

// ----------------------------------------------------
// Prompt Enhancer API
// ----------------------------------------------------
app.post("/api/enhance-prompt", async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, vibe, category } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      const enhanced = `Crée une application web moderne et interactive : "${prompt}". 
Style visuel : ${vibe || "Moderne et épuré avec Tailwind CSS"}. 
Fonctionnalités clés : interface ultra-intuitive, données dynamiques avec persistance LocalStorage, animations fluides, boutons interactifs avec retours visuels immédiats, design entièrement responsive mobile/desktop.`;
      return res.json({ enhancedPrompt: enhanced });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Tu es un expert en Prompt Engineering pour le Vibecoding (création d'applications web sans coder pour débutants, style Lovable).
L'utilisateur débutant a écrit cette idée : "${prompt}"
Vibe/Style souhaité : "${vibe || "Moderne et soigné"}"
Catégorie : "${category || "Application Web"}"

Transforme ce prompt débutant en un prompt de vibecoding complet, clair et ultra-précis en français qui décrit :
1. Le but principal de l'application
2. La structure de l'interface (Header, sections clés, cartes, modales)
3. Les interactions interactives (clics, filtres, formulaires, calculs, sons ou retours visuels)
4. Les données initiales réalistes et le stockage LocalStorage
5. Le style visuel (Tailwind CSS, animations, palette de couleurs cohérente)

Renvoie UNIQUEMENT le texte du prompt enrichi, sans préambule ni balises de code Markdown.`,
    });

    const enhanced = response.text?.trim() || prompt;
    statsTracker.recordGeneration(Date.now() - startTime, 300);
    res.json({ enhancedPrompt: enhanced });
  } catch (error: any) {
    statsTracker.recordError();
    logger.error("EnhancePrompt", "Error in enhance-prompt", error);
    res.status(500).json({ error: error.message || "Failed to enhance prompt" });
  }
});

// ----------------------------------------------------
// Generate Code API (Multi-File JSON Architecture with Sandbox Isolation)
// ----------------------------------------------------
const handleGenerateApp = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientId = getClientId(req);

  try {
    const { prompt, vibe } = req.body;
    logger.info("GenerateApp", `Nouvelle requête de génération d'application recibue - Prompt: "${(prompt || '').slice(0, 60)}" (Vibe: ${vibe || 'défaut'})`);

    // --- PASS 1: Generate Technical Architecture Plan ---
    const pass1Start = Date.now();
    const sysInstructionPlan = "Tu es architecte senior. Analyse ce besoin et génère un plan technique JSON : structure des fichiers, logique JS par module, données/états, interactions, dépendances. PAS de code, juste le plan.";
    const planPrompt = `Demande de l'utilisateur : "${prompt}". Style / Vibe : "${vibe || "Moderne et dynamique"}". Génère le plan technique d'architecture pour cette application.`;

    const { result: planResult } = await providerRegistry.executeWithRouting<string>(
      'CODE_PLANNING',
      async (provider) => {
        const resp = await provider.generateText({
          prompt: planPrompt,
          systemInstruction: sysInstructionPlan,
          temperature: 0.2,
          maxTokens: 8192,
          timeoutMs: 30000,
        });
        return resp.text;
      }
    );
    const pass1Duration = Date.now() - pass1Start;
    console.log(`[PASS 1] Plan generated in ${pass1Duration}ms`);
    logger.info("GenerateApp", `[PASS 1] Plan generated in ${pass1Duration}ms`);

    let planData: any = null;
    try {
      let cleanedPlan = (planResult || "").trim();
      if (cleanedPlan.includes("```json")) {
        cleanedPlan = cleanedPlan.split("```json")[1].split("```")[0].trim();
      } else if (cleanedPlan.includes("```")) {
        cleanedPlan = cleanedPlan.split("```")[1].split("```")[0].trim();
      }
      planData = JSON.parse(cleanedPlan);
    } catch {
      planData = { rawPlan: planResult };
    }

    // --- PASS 2: Generate Code following Approved Plan ---
    const pass2Start = Date.now();
    const systemInstruction = `Tu es l'architecte principal de VibeCode Studio.

RÈGLES ABSOLUES :
1. Tu as reçu un PLAN TECHNIQUE approuvé. Suis-le À LA LETTRE.
2. Chaque bouton a un onclick tangible. Pas de placeholder.
3. Chaque modale s'ouvre ET se ferme.
4. Données réalistes : vrais noms, textes cohérents, pas de Lorem Ipsum.
5. Design moderne : Tailwind CSS, ombres douces, arrondis 8-16px, typographie soignée.
6. Responsive mobile-first.
7. Accessibilité : aria-labels, contrastes WCAG AA.
8. Pas de memory leaks, nettoyer les event listeners.
9. FORMAT : JSON { files: [{name, type, content}] }`;

    const userMessage = `Plan technique approuvé :\n${JSON.stringify(planData, null, 2)}\n\nGénère maintenant le code conforme à ce plan.\nDemande de l'utilisateur : "${prompt}". Vibe sélectionnée : "${vibe || "Moderne et dynamique"}".`;

    const { result } = await providerRegistry.executeWithRouting<string>(
      'CODE_GENERATION',
      async (provider) => {
        const resp = await provider.generateText({
          prompt: userMessage,
          systemInstruction,
          temperature: 0.2,
          maxTokens: 32768,
        });
        return resp.text;
      }
    );
    const pass2Duration = Date.now() - pass2Start;
    console.log(`[PASS 2] Code generated in ${pass2Duration}ms`);
    logger.info("GenerateApp", `[PASS 2] Code generated in ${pass2Duration}ms`);
    const text = (result || "") as string;

    // --- Intelligent LLM Auto-Repair ---
    let data: any;
    let cleanedText = text.trim();
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText.split("```json")[1].split("```")[0].trim();
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.split("```")[1].split("```")[0].trim();
    }

    try {
      data = JSON.parse(cleanedText);
    } catch (parseErr: any) {
      logger.warn("GenerateApp", `Parsing direct JSON échoué (${parseErr.message}). Tentative d'auto-réparation LLM...`);
      try {
        const repairPrompt = `Ce JSON est invalide. Erreur : ${parseErr.message}. Corrige-le et retourne un JSON valide avec la même structure.\n\nJSON erroné :\n${cleanedText}`;
        const { result: repairedResult } = await providerRegistry.executeWithRouting<string>(
          'CODE_GENERATION',
          async (provider) => {
            const resp = await provider.generateText({
              prompt: repairPrompt,
              systemInstruction: 'Tu es un réparateur JSON expert. Retourne UNIQUEMENT le JSON corrigé valide sans préambule ni balises Markdown.',
              temperature: 0.1,
              maxTokens: 32768,
            });
            return resp.text;
          }
        );
        let repairedCleaned = (repairedResult || "").trim();
        if (repairedCleaned.includes("```json")) {
          repairedCleaned = repairedCleaned.split("```json")[1].split("```")[0].trim();
        } else if (repairedCleaned.includes("```")) {
          repairedCleaned = repairedCleaned.split("```")[1].split("```")[0].trim();
        }
        data = JSON.parse(repairedCleaned);
      } catch (repairErr: any) {
        logger.error("GenerateApp", `Échec auto-réparation LLM: ${repairErr.message}`);
        throw new Error("Erreur de parsing JSON après tentative de réparation par l'IA : " + repairErr.message);
      }
    }

    // Process files and unify iframe HTML
    if (!Array.isArray(data.files) || data.files.length === 0) {
      if (data.html) {
        data.files = extractFilesFromHtml(data.html);
      } else {
        data.files = [{ name: 'index.html', type: 'html', content: '' }];
      }
    }

    const entryPoint = data.entryPoint || 'index.html';
    data.entryPoint = entryPoint;
    data.technicalPlan = planData;
    data.html = buildIframeHtml(data.files, entryPoint);

    // Sandbox & Output Validation
    const validation = hardenedSecurityShield.validateGeneratedOutput(data);
    if (validation.sanitizedFiles.length > 0) {
      data.files = validation.sanitizedFiles;
    }
    if (data.html) {
      data.html = sandboxService.prepareSafeIframeHtml(data.html).safeHtml;
    }

    const duration = Date.now() - startTime;
    const estimatedTokens = Math.round((text.length + (prompt || '').length) / 4);
    statsTracker.recordGeneration(duration, estimatedTokens);
    rateLimiter.recordTokenUsage(clientId, estimatedTokens);

    res.json({ success: true, ...data });
  } catch (error: any) {
    statsTracker.recordError();
    logger.error("GenerateApp", "Error in generate-app", error);
    res.json({
      success: false,
      requiresLocalFallback: true,
      error: error.message,
    });
  }
};

app.post("/api/generate-app", generationRateLimiter, validateBody(generateAppSchema), optionalAuth, handleGenerateApp);
app.post("/api/generate", generationRateLimiter, validateBody(generateAppSchema), optionalAuth, handleGenerateApp);

// ----------------------------------------------------
// Iterate/Edit Code API (Multi-File JSON Support)
// ----------------------------------------------------
const handleIterateApp = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientId = getClientId(req);

  try {
    const { currentHtml, files, prompt, elementTarget, targetFile } = req.body;

    const systemInstruction = `Tu es l'assistant de modification de code de VibeCode Studio.
L'utilisateur veut itérer sur son application web multi-fichiers existante.
Tu dois renvoyer l'ensemble des fichiers du projet mis à jour avec les modifications demandées, en veillant à ne rien casser d'existant.

Renvoie UNIQUEMENT un objet JSON valide avec cette structure :
{
  "summary": "Résumé en une phrase des modifications effectuées",
  "entryPoint": "index.html",
  "files": [
    { "name": "index.html", "type": "html", "content": "..." },
    { "name": "style.css", "type": "css", "content": "..." },
    { "name": "app.js", "type": "javascript", "content": "..." }
  ],
  "suggestedPrompts": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}`;

    let contextSnippet = '';
    if (Array.isArray(files) && files.length > 0) {
      contextSnippet = files.map((f: any) => `--- FICHIER: ${f.name} ---\n${f.content || ''}`).join('\n\n');
    } else if (currentHtml) {
      contextSnippet = `--- CODE HTML ACTUEL ---\n${currentHtml}`;
    }

    const userMessage = `Voici les fichiers actuels du projet :
${contextSnippet}

Demande de modification de l'utilisateur : "${prompt}"
${targetFile ? `Fichier ciblé en priorité : ${targetFile}` : ''}
${elementTarget ? `Élément ciblé spécifiquement : ${JSON.stringify(elementTarget)}` : ''}`;

    const { result } = await providerRegistry.executeWithRouting<string>(
      'CODE_GENERATION',
      async (provider) => {
        const resp = await provider.generateText({
          prompt: userMessage,
          systemInstruction,
          temperature: 0.2,
          maxTokens: 32768,
        });
        return resp.text;
      }
    );
    const text = (result || "") as string;

    let data: any;
    let cleanedText = text.trim();
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText.split("```json")[1].split("```")[0].trim();
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.split("```")[1].split("```")[0].trim();
    }

    try {
      data = JSON.parse(cleanedText);
    } catch (parseErr: any) {
      logger.warn("IterateApp", `Parsing direct JSON échoué (${parseErr.message}). Tentative d'auto-réparation LLM...`);
      try {
        const repairPrompt = `Ce JSON est invalide. Erreur : ${parseErr.message}. Corrige-le et retourne un JSON valide avec la même structure.\n\nJSON erroné :\n${cleanedText}`;
        const { result: repairedResult } = await providerRegistry.executeWithRouting<string>(
          'CODE_GENERATION',
          async (provider) => {
            const resp = await provider.generateText({
              prompt: repairPrompt,
              systemInstruction: 'Tu es un réparateur JSON expert. Retourne UNIQUEMENT le JSON corrigé valide sans préambule ni balises Markdown.',
              temperature: 0.1,
              maxTokens: 32768,
            });
            return resp.text;
          }
        );
        let repairedCleaned = (repairedResult || "").trim();
        if (repairedCleaned.includes("```json")) {
          repairedCleaned = repairedCleaned.split("```json")[1].split("```")[0].trim();
        } else if (repairedCleaned.includes("```")) {
          repairedCleaned = repairedCleaned.split("```")[1].split("```")[0].trim();
        }
        data = JSON.parse(repairedCleaned);
      } catch (repairErr: any) {
        logger.error("IterateApp", `Échec auto-réparation LLM: ${repairErr.message}`);
        throw new Error("Erreur de parsing JSON après tentative de réparation par l'IA : " + repairErr.message);
      }
    }

    // Process files and assemble unified iframe HTML
    if (!Array.isArray(data.files) || data.files.length === 0) {
      if (data.html) {
        data.files = extractFilesFromHtml(data.html);
      } else if (Array.isArray(files) && files.length > 0) {
        data.files = files;
      } else if (currentHtml) {
        data.files = extractFilesFromHtml(currentHtml);
      }
    }

    const entryPoint = data.entryPoint || 'index.html';
    data.entryPoint = entryPoint;
    data.html = buildIframeHtml(data.files, entryPoint);

    if (data.html) {
      data.html = sandboxService.prepareSafeIframeHtml(data.html).safeHtml;
    }

    const duration = Date.now() - startTime;
    const estimatedTokens = Math.round((text.length + prompt.length) / 4);
    statsTracker.recordIteration(duration, estimatedTokens);
    rateLimiter.recordTokenUsage(clientId, estimatedTokens);

    res.json({ success: true, ...data });
  } catch (error: any) {
    statsTracker.recordError();
    logger.error("IterateApp", "Error in iterate-app", error);
    res.json({
      success: false,
      requiresLocalFallback: true,
      error: error.message,
    });
  }
};

app.post("/api/iterate-app", generationRateLimiter, validateBody(iterateAppSchema), optionalAuth, handleIterateApp);
app.post("/api/iterate", generationRateLimiter, validateBody(iterateAppSchema), optionalAuth, handleIterateApp);

// ----------------------------------------------------
// Real-Time Streaming SSE API (Live Step-by-Step Generation)
// ----------------------------------------------------
app.post("/api/stream-generate", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientId = getClientId(req);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  statsTracker.incrementStream();

  try {
    const { prompt, vibe } = req.body;
    const ai = getGeminiClient();

    sendEvent("step", { label: "🧠 Analyse architecturale du prompt...", status: "in-progress" });

    if (!ai) {
      sendEvent("step", { label: "⚡ Basculement sur le moteur local haute vitesse...", status: "completed" });
      sendEvent("fallback", { message: "Moteur local prêt" });
      res.end();
      statsTracker.decrementStream();
      return;
    }

    sendEvent("step", { label: "🎨 Génération de la palette et du Design System...", status: "in-progress" });
    
    const systemInstruction = `Tu es le moteur d'intelligence artificielle de VibeCode Studio.
Génère une application web complète, propre et autonome dans un seul fichier HTML complet avec Tailwind CSS, Lucide Icons, et JavaScript fonctionnel.
Renvoie UNIQUEMENT un objet JSON valide avec :
{
  "title": "Nom de l'application",
  "description": "Courte description",
  "vibe": "Style visuel",
  "html": "<!DOCTYPE html><html>...</html>",
  "files": [
    { "name": "index.html", "type": "html", "content": "..." },
    { "name": "app.js", "type": "javascript", "content": "..." },
    { "name": "styles.css", "type": "css", "content": "..." }
  ],
  "components": [
    { "name": "NomDuComposant", "description": "Ce que fait ce composant" }
  ],
  "suggestedPrompts": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}`;

    sendEvent("step", { label: "💻 Écriture des composants interactifs & scripts...", status: "in-progress" });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Crée l'application web pour : "${prompt}". Vibe : "${vibe || "Moderne"}".`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    sendEvent("step", { label: "🚀 Assemblage et compilation de l'aperçu...", status: "completed" });

    const text = response.text?.trim() || "";
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleaned);
    }

    if (data.html) {
      data.html = sandboxService.prepareSafeIframeHtml(data.html).safeHtml;
    }

    const duration = Date.now() - startTime;
    const estimatedTokens = Math.round((text.length + prompt.length) / 4);
    statsTracker.recordGeneration(duration, estimatedTokens);
    rateLimiter.recordTokenUsage(clientId, estimatedTokens);

    sendEvent("complete", { success: true, ...data, duration, tokens: estimatedTokens });
    res.end();
  } catch (error: any) {
    statsTracker.recordError();
    logger.error("StreamGenerate", "Stream generation error", error);
    sendEvent("error", { error: error.message || "Erreur de génération stream" });
    res.end();
  } finally {
    statsTracker.decrementStream();
  }
});

// ----------------------------------------------------
// Register Worker Queue Handlers
// ----------------------------------------------------
distributedJobQueue.registerHandler("generate_app", async (job) => {
  const { prompt, vibe } = job.payload;
  const ai = getGeminiClient();
  if (!ai) return { fallback: true };
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Crée l'application pour: ${prompt}`,
  });
  return { text: response.text };
});

// ----------------------------------------------------
// Vite Middleware / Production Static Assets
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info("Server", `🚀 VibeCode Enterprise High-Availability Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
