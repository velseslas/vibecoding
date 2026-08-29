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

import { rateLimiter } from "./server/rateLimiter";
import { statsTracker } from "./server/statsTracker";
import { projectStore } from "./server/projectStore";
import { authStore } from "./server/authStore";
import { jobQueue } from "./server/jobQueue";
import { billingService } from "./server/billingService";
import { securityShield } from "./server/securityShield";

dotenv.config();

const app = express();
const PORT = 3000;

// Raw body parser for Stripe Webhook signature verification
app.use(
  express.json({
    limit: "15mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// 1. Correlation & Observability Middleware (X-Request-Id)
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
app.post("/api/conversation/message", async (req, res) => {
  try {
    const { projectId, prompt, vibe, currentHtml, files, confirmedByUser, rejectPlan, changesetId, rejectChangesetId, elementTarget } = req.body;
    if (!prompt && !rejectPlan && !changesetId && !rejectChangesetId) {
      return res.status(400).json({ success: false, error: "Prompt ou action requise" });
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = authStore.getUserByToken(token);
    const userId = user?.uid || "usr_admin_001";

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

app.post("/api/changesets/:id/approve", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = authStore.getUserByToken(token);
    const userId = user?.uid || "usr_admin_001";
    const approved = validatedArtifactEngine.approveChangeset(req.params.id, userId);
    res.json({ success: true, changeset: approved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/changesets/:id/reject", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = authStore.getUserByToken(token);
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
app.post("/api/preview/create", (req, res) => {
  const { projectId, htmlContent, versionId } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = authStore.getUserByToken(token);

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

app.get("/api/billing/invoices", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = authStore.getUserByToken(token);
  const invoices = billingService.getInvoices(user?.uid || "usr_admin_001");
  res.json({ success: true, invoices });
});

app.post("/api/billing/checkout", async (req, res) => {
  const { planId, email } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = authStore.getUserByToken(token);
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
      model: "gemini-3.7-flash",
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
// Generate Code API (Standard JSON with Sandbox Isolation)
// ----------------------------------------------------
const handleGenerateApp = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientId = getClientId(req);

  try {
    const { prompt, vibe } = req.body;

    const systemInstruction = `Tu es le moteur d'intelligence artificielle de VibeCode Studio (style Lovable.dev).
Ta mission est de générer une application web complète, fonctionnelle, magnifique et prête à être exécutée dans un iframe.
L'utilisateur est un débutant en programmation. L'application doit fonctionner à 100% de manière autonome dans un seul fichier HTML complet incluant :
- Tailwind CSS v3 via CDN (<script src="https://cdn.tailwindcss.com"></script>)
- Lucide Icons via CDN (<script src="https://unpkg.com/lucide@latest"></script> puis appel à lucide.createIcons())
- Font Google moderne (Inter ou Plus Jakarta Sans)
- Tout le JavaScript nécessaire (interactivité complète, gestion d'état, LocalStorage, animations fluides, modales, filtres, calculs)
- Pas de placeholders incomplets ! Le code doit être riche, beau et directement testable.

Renvoie UNIQUEMENT un objet JSON valide suivant exactement cette structure :
{
  "title": "Nom de l'application",
  "description": "Courte description en français",
  "vibe": "Style visuel appliqué",
  "html": "<!DOCTYPE html><html>...</html>",
  "files": [
    { "name": "index.html", "type": "html", "content": "..." },
    { "name": "app.js", "type": "javascript", "content": "..." },
    { "name": "styles.css", "type": "css", "content": "..." }
  ],
  "components": [
    { "name": "NomDuComposant", "description": "Ce que fait ce composant" }
  ],
  "suggestedPrompts": [
    "Ajouter un mode sombre...",
    "Ajouter un filtre de recherche...",
    "Exporter les données en JSON..."
  ]
}`;

    const userMessage = `Crée l'application web pour ce prompt : "${prompt}". Vibe sélectionnée : "${vibe || "Moderne et dynamique"}".`;

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

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleaned);
    }

    // Sandbox & Output Validation
    const validation = hardenedSecurityShield.validateGeneratedOutput(data);
    if (validation.sanitizedFiles.length > 0) {
      data.files = validation.sanitizedFiles;
    }
    if (data.html) {
      data.html = sandboxService.prepareSafeIframeHtml(data.html).safeHtml;
    }

    const duration = Date.now() - startTime;
    const estimatedTokens = Math.round((text.length + prompt.length) / 4);
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

app.post("/api/generate-app", handleGenerateApp);
app.post("/api/generate", handleGenerateApp);

// ----------------------------------------------------
// Iterate/Edit Code API (Standard JSON)
// ----------------------------------------------------
const handleIterateApp = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientId = getClientId(req);

  try {
    const { currentHtml, prompt, elementTarget } = req.body;

    const systemInstruction = `Tu es l'assistant de modification de code de VibeCode Studio.
L'utilisateur veut itérer sur son application web existante.
Tu dois renvoyer le code HTML complet modifié avec les changements demandés, en veillant à ne rien casser d'existant tout en intégrant la nouvelle fonctionnalité.

Renvoie UNIQUEMENT un objet JSON valide avec cette structure :
{
  "summary": "Résumé en une phrase des modifications effectuées",
  "html": "<!DOCTYPE html><html>...</html>",
  "suggestedPrompts": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}`;

    const userMessage = `Voici le code HTML actuel :
\`\`\`html
${currentHtml}
\`\`\`

Demande de modification de l'utilisateur : "${prompt}"
${elementTarget ? `Élément ciblé spécifiquement : ${JSON.stringify(elementTarget)}` : ""}`;

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

app.post("/api/iterate-app", handleIterateApp);
app.post("/api/iterate", handleIterateApp);

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
      model: "gemini-3.7-flash",
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
    model: "gemini-3.7-flash",
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
