# VibeCode - Production-Hardened (Phase 1)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Configure your .env file
nano .env
# Set these MINIMUM variables:
#   - NODE_ENV=development (or production)
#   - DATABASE_URL=postgresql://...
#   - REDIS_URL=redis://localhost:6379
#   - AI_PROVIDER=openai (or any provider)
#   - AI_API_KEY=your_key
#   - AI_BASE_URL=https://api.openai.com/v1
#   - AI_MODEL=gpt-4-turbo

# 4. Start the server
npm run dev
```

Server runs at `http://localhost:3000`

---

## 🔒 Phase 1: Security Features

### What's New (Protection)

| Feature | What It Does |
|---------|-------------|
| **Request Tracking** | Every request gets a unique ID for debugging (`X-Correlation-ID`) |
| **Structured Logging** | Logs are JSON formatted, NO secrets exposed |
| **Security Headers** | Helmet + CORS + CSP protection against common attacks |
| **Authentication Enforcement** | MUST log in to access protected endpoints in production |
| **Rate Limiting** | 60 requests/minute per user (prevents abuse) |
| **Secrets Manager** | API keys stored securely, validated at startup |

### Protected Endpoints

**Requires Authentication (`/api/auth/login` first):**
```
POST   /api/projects         - Create new project
DELETE /api/projects/:id     - Delete your project
```

**Public Endpoints:**
```
GET    /health/live          - Server alive check
GET    /health/ready         - Server ready check
GET    /api/projects         - List all projects (read-only)
GET    /api/projects/:id     - Get project details
GET    /api/billing/tiers    - View billing plans
POST   /api/auth/login       - Login/register user
GET    /api/auth/me          - Get current user
GET    /api/security/health  - Security status
```

---

## ⚙️ Environment Variables Explained

```env
# REQUIRED
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/vibecoding
REDIS_URL=redis://localhost:6379
AI_PROVIDER=openai
AI_API_KEY=sk_...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4-turbo

# OPTIONAL (but recommended for production)
CLERK_ENABLED=false
CLERK_SECRET_KEY=your_key
JWT_SECRET=your_secret
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
STRIPE_SECRET_KEY=sk_...
```

---

## 📊 Monitoring & Debugging

### View Request Logs
```bash
# Logs are output to console in JSON format
# Example:
# {"level":"info","message":"API Request","statusCode":200,"durationMs":45}
```

### Check Security Health
```bash
curl http://localhost:3000/api/security/health
# Response:
# {
#   "success": true,
#   "status": "operational",
#   "checks": {
#     "authentication": "disabled",
#     "secrets": "valid",
#     "headers": "configured"
#   }
# }
```

### Health Probes (for Kubernetes/Docker)
```bash
# Liveness probe (is server running?)
curl http://localhost:3000/health/live

# Readiness probe (is server ready to serve traffic?)
curl http://localhost:3000/health/ready
```

---

## 🛡️ Security Best Practices

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Set `CLERK_ENABLED=true` with valid Clerk keys
- [ ] Set `ALLOWED_ORIGINS` to your domain only
- [ ] Use strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Enable HTTPS only (configure reverse proxy)
- [ ] Use managed PostgreSQL & Redis (e.g., AWS RDS, ElastiCache)
- [ ] Set up log aggregation (e.g., Datadog, ELK)
- [ ] Monitor rate limiting (check 429 responses)

### What NOT to Do ❌
- ❌ Log secrets or API keys
- ❌ Disable authentication in production
- ❌ Use default credentials
- ❌ Expose `ALLOWED_ORIGINS=*` in production
- ❌ Commit `.env` to git

---

## 📈 Architecture - Phase 1

```
┌─────────────────────────────────────────────────────┐
│              Express Server (server.ts)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. correlationIdMiddleware    (Request Tracking)   │
│  2. setupSecurityMiddleware    (Helmet + CORS)      │
│  3. Body Parser               (JSON 15MB limit)     │
│  4. rateLimitByUser           (60 req/min)          │
│                                                     │
│  ↓                                                   │
│                                                     │
│  API Routes:                                        │
│    - /api/projects    (Projects CRUD)               │
│    - /api/auth/*      (Authentication)              │
│    - /api/billing/*   (Billing)                     │
│    - /health/*        (Health checks)               │
│                                                     │
│  ↓                                                   │
│                                                     │
│  5. errorTrackingMiddleware    (Error Logging)      │
│                                                     │
└─────────────────────────────────────────────────────┘
       ↓                              ↓
   StructuredLogger             secretsManager
   (JSON logs, no secrets)      (Safe key storage)
```

---

## 🔧 Troubleshooting

### Error: "Missing required secrets"
```
Solution: Check .env file has AI_API_KEY and other required variables set
```

### Error: "Cannot connect to Redis"
```bash
# Make sure Redis is running:
redis-cli ping
# Should return: PONG

# If not running:
brew install redis  # macOS
apt install redis-server  # Ubuntu
```

### Error: "Cannot connect to PostgreSQL"
```bash
# Check DATABASE_URL is correct:
psql $DATABASE_URL
# Should connect successfully
```

### Rate limiting blocking requests
```
The server allows 60 requests per user per minute.
If you get 429 errors, wait 1 minute or upgrade to a higher tier.
```

---

## 📝 Next Steps (Phase 2 - Coming Soon)

- [ ] Redis caching for AI responses (10x cost reduction)
- [ ] Token budget tracking (prevent runaway costs)
- [ ] Tier-based quotas (FREE/PRO/ENTERPRISE)
- [ ] Database connection pooling
- [ ] Prompt optimization engine

---

## 📚 API Documentation

### Authentication
```bash
# Login (create account if doesn't exist)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John"}'

# Response:
# {
#   "success": true,
#   "token": "jwt_token_here",
#   "user": {"uid":"usr_123","email":"user@example.com"}
# }
```

### Create Project (Requires Token)
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "My App",
    "description": "A cool web app"
  }'
```

### Get Projects
```bash
curl http://localhost:3000/api/projects
```

---

## 🤝 Contributing

This branch (`feat/production-hardening`) implements security best practices incrementally.

**Current Phase:** 1 (Security foundation)

To contribute:
1. Create a feature branch from this branch
2. Follow the existing code style
3. Test with `npm run type-check`
4. Submit PR with clear description

---

## 📞 Support

For issues, questions, or suggestions:
- Check `.env.example` for all available variables
- Review error messages in logs
- Ensure all prerequisites are installed

---

**Last Updated:** 2026-09-01  
**Status:** 🔒 Phase 1 - Production Ready (Security Foundation)
