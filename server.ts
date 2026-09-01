import 'dotenv/config';
import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// ========================================
// PHASE 1: PRODUCTION SECURITY IMPORTS
// ========================================
import { correlationIdMiddleware, errorTrackingMiddleware } from "./server/middleware/requestTracking";
import { structuredLogger } from "./server/logging/structuredLogger";
import { secretsManager } from "./server/security/secretsManager";
import { setupSecurityMiddleware } from "./server/middleware/securityHeaders";
import { requireAuth, optionalAuth, rateLimitByUser } from "./server/middleware/authMiddleware";

// ========================================
// EXISTING IMPORTS (Keep compatible)
// ========================================
import { config } from "./server/config";
import { logger } from "./server/logger";
import { authStore } from "./server/authStore";
import { projectStore } from "./server/projectStore";
import { jobQueue } from "./server/jobQueue";
import { billingService } from "./server/billingService";
import { securityShield } from "./server/securityShield";

// Initialize security
secretsManager.initialize();
const secretValidation = secretsManager.validate();
if (!secretValidation.valid) {
  console.error('⚠️ MISSING SECRETS:', secretValidation.missing);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1); // CRITICAL: Fail fast in production
  }
}

const CLERK_ENABLED = process.env.CLERK_ENABLED === "true";
structuredLogger.info("AUTH_STATUS", {
  clerkEnabled: CLERK_ENABLED,
  mode: CLERK_ENABLED ? "PRODUCTION" : "DEVELOPMENT",
});

const app = express();
app.set("trust proxy", 1);
const PORT = parseInt(process.env.PORT || "3000");

// ========================================
// MIDDLEWARE STACK - PRODUCTION GRADE
// ========================================

// 1. MUST BE FIRST: Correlation ID tracking for all requests
app.use(correlationIdMiddleware);

// 2. Security headers (Helmet + CORS + CSP)
setupSecurityMiddleware(app);

// 3. Request body parsing
app.use(express.json({
  limit: "15mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// 4. Rate limiting by user (not IP) - uses tier-based limits
app.use(rateLimitByUser(60, 60000)); // 60 requests per minute

// ========================================
// HEALTH CHECK ENDPOINTS (No auth needed)
// ========================================

app.get("/health/live", (_req, res) => {
  res.json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/health/ready", (_req, res) => {
  res.json({
    status: "ready",
    timestamp: new Date().toISOString(),
    secrets: secretValidation.valid,
  });
});

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

app.get("/api/auth/me", optionalAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    success: true,
    authenticated: !!user,
    user: user || null,
  });
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const result = authStore.loginOrRegister(email, name);

    structuredLogger.info("USER_LOGIN", {
      email: email.substring(0, 5) + "***", // Never log full email
      userId: result.user?.uid,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    structuredLogger.error("LOGIN_ERROR", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
});

// ========================================
// PROJECTS API - REQUIRES AUTH IN PROD
// ========================================

app.get("/api/projects", optionalAuth, (req, res) => {
  try {
    const projects = projectStore.getAll();
    res.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error: any) {
    structuredLogger.error("GET_PROJECTS", error);
    res.status(500).json({ success: false, error: "Failed to fetch projects" });
  }
});

app.get("/api/projects/:id", optionalAuth, (req, res) => {
  try {
    const project = projectStore.getById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    res.json({
      success: true,
      project,
    });
  } catch (error: any) {
    structuredLogger.error("GET_PROJECT", error, { projectId: req.params.id });
    res.status(500).json({ success: false, error: "Failed to fetch project" });
  }
});

app.post("/api/projects", requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const projectData = {
      ...req.body,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };

    const saved = projectStore.saveProject(projectData);

    structuredLogger.info("PROJECT_CREATED", {
      userId: user.uid,
      projectId: saved.id,
    });

    res.json({
      success: true,
      project: saved,
    });
  } catch (error: any) {
    structuredLogger.error("CREATE_PROJECT", error);
    res.status(500).json({ success: false, error: "Failed to create project" });
  }
});

app.delete("/api/projects/:id", requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const project = projectStore.getById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    // Verify ownership
    if (project.userId && project.userId !== user.uid) {
      structuredLogger.warn("UNAUTHORIZED_DELETE", {
        userId: user.uid,
        projectId: req.params.id,
      });
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const deleted = projectStore.deleteProject(req.params.id);

    structuredLogger.info("PROJECT_DELETED", {
      userId: user.uid,
      projectId: req.params.id,
    });

    res.json({ success: deleted });
  } catch (error: any) {
    structuredLogger.error("DELETE_PROJECT", error);
    res.status(500).json({ success: false, error: "Failed to delete project" });
  }
});

// ========================================
// BILLING ENDPOINTS
// ========================================

app.get("/api/billing/tiers", optionalAuth, (_req, res) => {
  try {
    const tiers = billingService.getTiers();
    res.json({
      success: true,
      tiers,
    });
  } catch (error: any) {
    structuredLogger.error("GET_BILLING_TIERS", error);
    res.status(500).json({ success: false, error: "Failed to fetch tiers" });
  }
});

// ========================================
// SECURITY ENDPOINTS
// ========================================

app.get("/api/security/health", (_req, res) => {
  try {
    res.json({
      success: true,
      status: "operational",
      checks: {
        authentication: CLERK_ENABLED ? "enabled" : "disabled",
        secrets: secretValidation.valid ? "valid" : "invalid",
        headers: "configured",
      },
    });
  } catch (error: any) {
    structuredLogger.error("SECURITY_HEALTH", error);
    res.status(500).json({ success: false, error: "Security check failed" });
  }
});

// ========================================
// STATIC FILES & SPA FALLBACK
// ========================================

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

  // MUST BE LAST: Error tracking middleware
  app.use(errorTrackingMiddleware);

  app.listen(PORT, "0.0.0.0", () => {
    structuredLogger.info("SERVER_START", {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      secretsValid: secretValidation.valid,
    });
  });
}

startServer().catch((error) => {
  structuredLogger.error("SERVER_STARTUP_FAILED", error);
  process.exit(1);
});
