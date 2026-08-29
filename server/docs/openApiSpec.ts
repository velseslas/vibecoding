export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'VibeCode Studio Enterprise Engine API',
    version: '2.4.0',
    description: 'Production-Grade Distributed Backend for Real-Time AI Vibecoding with Circuit Breakers, Redlock, Transactional DB, and Idempotency.',
    contact: {
      name: 'VibeCode Platform Team',
      email: 'engineering@vibecode.io',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Production & Container Environment',
    },
  ],
  paths: {
    '/health/live': {
      get: {
        summary: 'Liveness Probe',
        description: 'Returns HTTP 200 if container runtime is alive.',
        responses: {
          '200': {
            description: 'Container is live',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'alive' }, uptime: { type: 'number' } } } } },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        summary: 'Readiness Probe',
        description: 'Checks connectivity to Database, Redis cluster, and Job Queue.',
        responses: {
          '200': { description: 'All systems operational' },
          '503': { description: 'System degraded or dependency unavailable' },
        },
      },
    },
    '/metrics': {
      get: {
        summary: 'Prometheus Observability Exposition Endpoint',
        description: 'Provides real-time standard Prometheus metrics (HTTP, DB, Redis, Jobs, AI Circuit Breaker, Idempotency).',
        responses: {
          '200': {
            description: 'Prometheus text format metrics stream',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/api/stats': {
      get: {
        summary: 'Client Quotas & System Telemetry Snapshot',
        description: 'Returns current rate limits, token usage, and latency percentiles (p50/p95/p99).',
        responses: {
          '200': { description: 'Stats snapshot' },
        },
      },
    },
    '/api/enhance-prompt': {
      post: {
        summary: 'AI Prompt Engineering & Expansion',
        description: 'Enriches raw beginner prompts into structured, production-ready vibecoding prompts.',
        parameters: [
          { in: 'header', name: 'X-Request-Id', schema: { type: 'string' }, required: false },
          { in: 'header', name: 'X-Idempotency-Key', schema: { type: 'string' }, required: false },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string', example: 'Créer une application de tableau de bord fitness' },
                  vibe: { type: 'string', example: 'modern-saas' },
                  category: { type: 'string', example: 'Productivity' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Enhanced prompt returned' },
          '400': { description: 'Blocked by Security WAF Sanitizer' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/generate-app': {
      post: {
        summary: 'Generate Complete Web Application',
        description: 'Generates single-page web app with Tailwind CSS, Lucide icons, components and sandboxed HTML.',
        parameters: [
          { in: 'header', name: 'X-Request-Id', schema: { type: 'string' } },
          { in: 'header', name: 'X-Idempotency-Key', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string' },
                  vibe: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Generated application code and file manifests' },
          '409': { description: 'Idempotency conflict' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/iterate-app': {
      post: {
        summary: 'Iterate & Modify Web Application Code',
        description: 'Modifies existing web application HTML/JS based on natural language instructions or targeted visual elements.',
        parameters: [
          { in: 'header', name: 'X-Request-Id', schema: { type: 'string' } },
          { in: 'header', name: 'X-Idempotency-Key', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentHtml', 'prompt'],
                properties: {
                  currentHtml: { type: 'string' },
                  prompt: { type: 'string' },
                  elementTarget: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Iterated code with updated HTML' },
        },
      },
    },
    '/api/stream-generate': {
      post: {
        summary: 'Real-Time Server-Sent Events (SSE) Generation',
        description: 'Streams step-by-step progress and compilation results in real time.',
        responses: {
          '200': {
            description: 'SSE event stream',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/api/projects': {
      get: {
        summary: 'List Projects',
        responses: { '200': { description: 'Array of projects' } },
      },
      post: {
        summary: 'Save or Create Project',
        parameters: [
          { in: 'header', name: 'X-Idempotency-Key', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Saved project' } },
      },
    },
    '/api/projects/{id}': {
      get: {
        summary: 'Get Project by ID',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Project details' }, '404': { description: 'Not found' } },
      },
      delete: {
        summary: 'Soft Delete Project',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deletion status' } },
      },
    },
    '/api/projects/{id}/fork': {
      post: {
        summary: 'Fork Project Branch',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Forked project' } },
      },
    },
    '/api/projects/{id}/versions': {
      get: {
        summary: 'Get Project Version History',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'List of versions' } },
      },
    },
    '/api/projects/{id}/rollback': {
      post: {
        summary: 'Rollback Project to Previous Version',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['versionId'], properties: { versionId: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Restored version record' } },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get Authenticated User Profile',
        responses: { '200': { description: 'User profile' } },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate or Register User Session',
        responses: { '200': { description: 'JWT or Session Token' } },
      },
    },
    '/api/billing/checkout': {
      post: {
        summary: 'Create Stripe Billing Checkout Session',
        responses: { '200': { description: 'Stripe Checkout URL' } },
      },
    },
    '/api/billing/webhook': {
      post: {
        summary: 'Stripe Webhook Cryptographic Ingestion',
        description: 'Validates Stripe HMAC signature and applies subscription events idempotently.',
        parameters: [{ in: 'header', name: 'stripe-signature', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Event processed' }, '400': { description: 'Invalid HMAC signature' } },
      },
    },
    '/api/security/health': {
      get: {
        summary: 'Security WAF & Threat Status',
        responses: { '200': { description: 'Security audit logs and status' } },
      },
    },
    '/api/conversation/message': {
      post: {
        summary: 'Unified Vibecoding Conversation & Intelligence Engine',
        description: 'Processes user messages through Intent, Context, Compass, Plan, Orchestration, Validation and Preview lifecycle.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'prompt'],
                properties: {
                  projectId: { type: 'string' },
                  prompt: { type: 'string' },
                  vibe: { type: 'string' },
                  currentHtml: { type: 'string' },
                  confirmedByUser: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Complete pipeline execution result with state compass, quality score and preview' },
        },
      },
    },
    '/api/projects/{id}/dna': {
      get: {
        summary: 'Get Application DNA & Architecture Knowledge',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Application DNA' } },
      },
    },
    '/api/projects/{id}/map': {
      get: {
        summary: 'Get Application Dependency Graph Map',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Application Relational Graph' } },
      },
    },
    '/api/projects/{id}/memory': {
      get: {
        summary: 'Get Project Memory & Architectural Decisions',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Project Memory' } },
      },
    },
    '/api/projects/{id}/metrics': {
      get: {
        summary: 'Get Project Learning & Quality Metrics',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Quality Metrics' } },
      },
    },
    '/api/preview/create': {
      post: {
        summary: 'Create Traceable Sandboxed Preview Session',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { projectId: { type: 'string' }, htmlContent: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Preview session created with CSP safe HTML' } },
      },
    },
    '/api/preview/{id}': {
      get: {
        summary: 'Get Preview Session Status & Lifecycle Telemetry',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Preview session details' } },
      },
    },
    '/api/preview/error': {
      post: {
        summary: 'Report Runtime Error from Preview Bridge',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['previewId', 'error'], properties: { previewId: { type: 'string' }, error: { type: 'object' } } } } },
        },
        responses: { '200': { description: 'Error recorded and normalized for AI repair' } },
      },
    },
  },
};

export function getSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>VibeCode Studio Enterprise - API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0b0f19; font-family: sans-serif; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`;
}
