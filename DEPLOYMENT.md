# Deployment Guide - Nature Meds API

## 🚀 Render Deployment (Recommended)

### Prerequisites
- [Render account](https://render.com)
- [Turso account](https://turso.tech)
- GitHub/GitLab repository with your code

### Step-by-Step Deployment

#### 1. Turso Database Setup
```bash
# Install Turso CLI (one-time)
curl -sSfL https://get.turso.tech/install.sh | bash

# Login to Turso
turso auth login

# Create database
turso db create nature-meds-prod

# Get database URL
turso db show nature-meds-prod --url
# Copy the URL: libsql://...turso.io

# Create auth token
turso db tokens create nature-meds-prod
# Copy the token
```

#### 2. Push Code to Git
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### 3. Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub/GitLab repository
4. Render will detect `render.yaml` and configure automatically
5. Click **"Apply"**

#### 4. Configure Environment Variables (IMPORTANT!)
After the blueprint creates the service, go to **Environment** tab and set these manually:

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | From Turso CLI |
| `TURSO_AUTH_TOKEN` | `your-token` | From Turso CLI |
| `JWT_SECRET` | Generate strong secret | `openssl rand -base64 32` |
| `SCITELY_API_KEY` | Your SciTely API key | From SciTely dashboard |
| `SMTP_USER` | your-email@gmail.com | Your email |
| `SMTP_PASS` | your-app-password | Gmail App Password |
| `EMAIL_FROM` | "Nature Meds <noreply@yourdomain.com>" | Your email |

#### 5. Run Database Migrations
```bash
# In Render Dashboard > Shell tab
npm run migrate
```

Or use Render CLI:
```bash
render ssh --service nature-meds-api
npm run migrate
```

#### 6. Verify Deployment
- **Health Check**: `https://nature-meds-api.onrender.com/health`
- **API Docs**: `https://nature-meds-api.onrender.com/api/v1`

---

## 🚂 Railway Deployment (Alternative)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables via dashboard
# Deploy
railway up
```

---

## 🛩️ Fly.io Deployment (Alternative)

```bash
# Install Fly CLI
fly install

# Launch
fly launch --no-deploy

# Set secrets
fly secrets set TURSO_DATABASE_URL="..."
fly secrets set TURSO_AUTH_TOKEN="..."
fly secrets set JWT_SECRET="..."

# Deploy
fly deploy
```

---

## ⚙️ Environment Variables Reference

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_DATABASE_URL` | Turso database URL | `libsql://nature-meds-prod.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth token | `eyJhbGciOiJIUzI1Ni...` |
| `JWT_SECRET` | JWT signing secret | `your-256-bit-secret` |
| `NODE_ENV` | Environment mode | `production` |

### AI/SciTely (Optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `SCITELY_API_KEY` | SciTely API key | - |
| `SCITELY_BASE_URL` | SciTely base URL | `https://api.scitely.com/v1` |
| `SCITELY_MODEL` | AI model | `qwen3-max` |

### Email/SMTP (Optional)
| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password | `your-app-password` |
| `EMAIL_FROM` | Sender email | `Nature Meds <noreply@example.com>` |

### CORS/Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend URL | `https://nature-meds.vercel.app` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `https://app1.com,https://app2.com` |

---

## 🔒 Security Checklist

- [ ] JWT_SECRET is strong (>32 chars, random)
- [ ] TURSO_AUTH_TOKEN is kept secret
- [ ] CORS_ORIGIN is set to specific domains (not `*` in production)
- [ ] SMTP credentials use App Passwords (not account password)
- [ ] API keys (SciTely) are rotated regularly

---

## 🔍 Troubleshooting

### "Cannot find module" errors
```bash
npm run build
# Ensure dist/ folder exists
```

### Database connection fails
1. Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
2. Check Turso database is not paused (free tier pauses after inactivity)
3. Test locally: `turso db shell nature-meds-prod`

### CORS errors from frontend
1. Update `CORS_ORIGIN` with actual frontend domain
2. Ensure `credentials: true` is set (already done in code)

### Migration failures
```bash
# Run manually in Render shell
npm run db:migrate
```

---

## 📊 Post-Deployment

1. **Update frontend** to use production API URL
2. **Set up monitoring** (Render has built-in metrics)
3. **Configure custom domain** (optional)
4. **Enable auto-deploy** on push (configured in render.yaml)

---

## 🔄 Continuous Deployment

The `render.yaml` is configured for auto-deploy:
- Push to `main` → Auto-deploy to production
- To disable: Go to Render Dashboard > Settings > Auto-Deploy: Off
