# 🚀 SETUP GUIDE - VibeCode Phase 1

**Durée:** ~10 minutes  
**Difficulté:** Facile  
**Résultat:** Serveur sécurisé prêt pour production

---

## ✅ Step 1: Prerequisites

Vérifiez que vous avez installé:

```bash
# Node.js 18+
node --version
# Expected: v18.x.x or higher

# npm 9+
npm --version
# Expected: 9.x.x or higher

# Docker (pour PostgreSQL + Redis)
docker --version
# Expected: Docker version 20.x.x or higher

# Docker Compose
docker compose --version
# Expected: Docker Compose version 2.x.x or higher
```

Si quelque chose manque, installez depuis:
- Node.js: https://nodejs.org/
- Docker: https://docker.com/

---

## 📋 Step 2: Clone & Install

```bash
# Clone the repository
git clone https://github.com/velseslas/vibecoding.git
cd vibecoding

# Switch to production-hardening branch
git checkout feat/production-hardening

# Install dependencies
npm install
```

**⏱️ Temps:** ~3 minutes

---

## 🗄️ Step 3: Start Database & Redis

### Option A: Docker (Recommended - 1 command)

```bash
# Start PostgreSQL + Redis in background
docker compose up -d

# Verify they're running
docker compose ps

# Expected output:
# NAME                 STATUS
# vibecoding-postgres  Up (healthy)
# vibecoding-redis     Up (healthy)
# vibecoding-pgadmin   Up

# View logs if needed
docker compose logs -f
```

**✅ Success:** You should see both services running

### Option B: Manual Installation (Linux/macOS)

```bash
# Install PostgreSQL
brew install postgresql@16  # macOS
# or: apt install postgresql-16  # Ubuntu

# Install Redis
brew install redis
# or: apt install redis-server

# Start PostgreSQL
brew services start postgresql@16
# or: systemctl start postgresql

# Start Redis
redis-server --daemonize yes
```

**Verify:**
```bash
psql --version
redis-cli ping  # Should output: PONG
```

---

## 🔑 Step 4: Configure Environment

```bash
# Copy template
cp .env.example .env

# Open and edit (use any editor)
nano .env
# or: code .env  (VS Code)
# or: vim .env
```

### MINIMUM Configuration

Set these variables:

```env
# ========================================
# REQUIRED
# ========================================
NODE_ENV=development
PORT=3000

# Database (from docker-compose)
DATABASE_URL=postgresql://vibecoding:vibecoding_dev_password@localhost:5432/vibecoding

# Redis (from docker-compose)
REDIS_URL=redis://localhost:6379

# AI Provider (choose ONE)
# Option 1: OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk_test_YOUR_OPENAI_KEY_HERE
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4-turbo

# Option 2: Anthropic
# AI_PROVIDER=anthropic
# AI_API_KEY=sk_ant_YOUR_ANTHROPIC_KEY_HERE
# AI_BASE_URL=https://api.anthropic.com
# AI_MODEL=claude-3-opus-20240229

# Option 3: Local (Ollama)
# AI_PROVIDER=ollama
# AI_BASE_URL=http://localhost:11434/v1
# AI_MODEL=llama2

# ========================================
# OPTIONAL
# ========================================
CLERK_ENABLED=false
JWT_SECRET=dev_secret_change_in_production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=info
```

**Save the file** (Ctrl+X, then Y, then Enter in nano)

---

## 🧪 Step 5: Test Database Connection

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Expected: PostgreSQL 16.x ...

# Test Redis connection
redis-cli ping

# Expected: PONG
```

If you get errors, check:
- Database URL spelling
- Docker containers running (`docker compose ps`)
- Ports not in use (`lsof -i :5432` or `lsof -i :6379`)

---

## 🏃 Step 6: Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Expected output:
# ▶ vibecoding
# ├─ Dev Server running at http://localhost:3000
# └─ Security Middleware: ENABLED
```

**Wait for:** "Server listening on port 3000"

---

## ✨ Step 7: Test the API

Open a new terminal (keep server running):

### Test 1: Health Check
```bash
curl http://localhost:3000/health/live

# Expected:
# {"status":"alive","timestamp":"2026-09-01T...","uptime":5.23}
```

### Test 2: List Projects
```bash
curl http://localhost:3000/api/projects

# Expected:
# {"success":true,"projects":[],"count":0}
```

### Test 3: Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Expected:
# {
#   "success": true,
#   "token": "eyJhbGc...",
#   "user": {"uid":"usr_123","email":"test@example.com"}
# }
```

### Test 4: Security Health
```bash
curl http://localhost:3000/api/security/health

# Expected:
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

✅ **If all tests pass, you're ready!**

---

## 📊 Step 8: Monitor Logs

All logs are JSON formatted for easy parsing:

```bash
# View real-time logs
tail -f logs/server.log  # if logging to file

# Filter logs by level
grep '"level":"error"' logs/server.log

# View correlation IDs (track single request)
grep 'X-Correlation-ID: abc-123' logs/server.log
```

---

## 🛑 Step 9: Troubleshooting

### Problem: "Cannot connect to PostgreSQL"
```bash
# Solution 1: Check docker containers
docker compose ps

# Solution 2: Check connection string
echo $DATABASE_URL

# Solution 3: Manually test connection
psql postgresql://vibecoding:vibecoding_dev_password@localhost:5432/vibecoding
```

### Problem: "Cannot connect to Redis"
```bash
# Solution 1: Test Redis
redis-cli ping

# Solution 2: Check port
lsof -i :6379

# Solution 3: Restart Redis
redis-cli shutdown
redis-server --daemonize yes
```

### Problem: "Port 3000 already in use"
```bash
# Find process using port
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Problem: "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Must be 18+
```

---

## 🎯 Next: Basic Testing

### Create a Project
```bash
# Get your token from login test (Step 7, Test 3)
TOKEN="your_token_from_test_3"

curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "My First App",
    "description": "A test project"
  }'

# Expected: 201 Created with project details
```

### List Your Projects
```bash
curl http://localhost:3000/api/projects
```

---

## 🚀 Production Deployment

### Build for Production
```bash
# Build the application
npm run build

# Output goes to: ./dist/

# Expected files:
# dist/
#   ├── client/        (React frontend)
#   ├── server.cjs     (Compiled server)
#   └── ...
```

### Build Docker Image
```bash
# Build image
docker build -t vibecoding:latest .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e AI_API_KEY=sk_... \
  vibecoding:latest

# Access at http://localhost:3000
```

### Deploy to Cloud

**AWS (EC2 + RDS + ElastiCache):**
```bash
# Build image and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URL
docker tag vibecoding:latest $ECR_URL/vibecoding:latest
docker push $ECR_URL/vibecoding:latest

# Deploy with ECS/EKS
# (See AWS deployment guide)
```

**Heroku:**
```bash
heroku login
git push heroku feat/production-hardening:main
```

**Railway/Render:**
- Connect GitHub repo
- Select `feat/production-hardening` branch
- Set environment variables in dashboard
- Deploy

---

## 📚 Additional Resources

| Topic | Link |
|-------|------|
| **Production Checklist** | See `README-PHASE1.md` |
| **API Documentation** | See `README-PHASE1.md` |
| **Docker Compose** | `docker-compose.yml` |
| **Environment Variables** | `.env.example` |
| **Security Guide** | `server/security/` |

---

## ✅ Success Checklist

- [x] Node.js 18+ installed
- [x] Docker installed
- [x] Repository cloned
- [x] Dependencies installed
- [x] PostgreSQL running
- [x] Redis running
- [x] `.env` configured
- [x] Server starts without errors
- [x] All API tests pass
- [x] Can create projects
- [x] Can login/register

🎉 **You're ready to go!**

---

## 🆘 Need Help?

1. **Check logs:** `npm run dev` shows detailed errors
2. **Environment:** Run `echo $DATABASE_URL` to verify config
3. **Docker:** Run `docker compose logs` for service errors
4. **Restart:** Stop all containers: `docker compose down && docker compose up -d`

---

**Last Updated:** 2026-09-01  
**Status:** ✅ Phase 1 Complete
