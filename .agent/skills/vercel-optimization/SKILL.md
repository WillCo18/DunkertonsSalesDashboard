---
name: Vercel Optimization
description: Standards and best practices for architecting Python/Next.js projects for Vercel deployment, including vercel.json configuration and standard project structure.
---

# Skill: Vercel Deployment Optimization & Architecture

## Purpose
To ensure all web projects are architected from the "Planning Stage" to be natively compatible with Vercel's serverless infrastructure, minimizing deployment errors and maximizing build efficiency.

---

## Quick Start: Pre-Deployment Checklist

Before every deployment to Vercel, verify these 5 items:

- [ ] **Framework Preset** matches your tech stack (Next.js, Svelte, Nuxt, Other)
- [ ] **Root Directory** points to correct folder if using monorepo
- [ ] **Node.js Version** compatible with your dependencies
- [ ] **Environment Variables** set for Production/Preview as needed
- [ ] **GitHub Integration** synced—push to main branch triggers auto-deploy

---

## 1. Framework Settings (Most Critical)

### What is Framework Preset?
Framework Preset tells Vercel which build system to use. It auto-configures:
- Build Command (e.g., `next build`)
- Output Directory (e.g., `.next`)
- Install Command (e.g., `npm install`)
- Development Command (e.g., `next dev --port $PORT`)

### Supported Frameworks
Vercel automatically detects and supports:
- **Next.js** (most common, optimized by Vercel)
- React (via Vite or Create React App)
- Vue.js (Nuxt, Vite)
- Svelte (SvelteKit)
- Gatsby, Hugo, Astro, Angular
- Static HTML/CSS/JS (set to "Other")
- And 20+ more...

### How Vercel Auto-Detects
Vercel scans your repo root for:
- `package.json` with framework-specific scripts
- `next.config.js` → Next.js
- `svelte.config.js` → Svelte
- `nuxt.config.ts` → Nuxt
- `gatsby-config.js` → Gatsby

### What If Detection Fails?
If no framework detected, "Other" is selected by default. This means:
- Override toggle for Build Command is enabled
- You must manually specify build commands
- Static files served from `public/` or root

### How to Override Framework

**Option 1: Dashboard (Easiest)**
1. Project → Settings → Build & Deployment
2. Framework Preset → Change dropdown
3. Save → Redeploy

**Option 2: vercel.json (Per-Deployment)**
Create `vercel.json` in your project root:
```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next"
}
```

---

## 2. Next.js Project Standards

### Required Files
- **`vercel.json`**: Framework configuration and routing rules
- **`.vercelignore`**: Exclude test files, scripts, and dev dependencies from build

### Standard Next.js vercel.json Template:
```json
{
  "framework": "nextjs",
  "regions": ["lhr1"],
  "github": {
    "silent": true
  }
}
```

### Standard .vercelignore Template:
```
# Testing
e2e/
test-results/
playwright-report/
*.spec.ts
*.test.ts

# Scripts & Automation
scripts/
*.sh
fetch_*.js
test_*.js

# Documentation
*.md
docs/

# Local Environment
.env*
.git
.DS_Store
node_modules/
```

---

## 3. Python/Dash Project Standards

### Required Files
- **`vercel.json`**: The routing brain. Prevents 404/NOT_FOUND errors.
- **`requirements.txt`**: Standardized Python dependencies.
- **`.vercelignore`**: To keep build bundles small (ignore local venv, __pycache__, and .env).

### Standard Python/Dash Template:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.py",
      "use": "@vercel/python"
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "index.py" }
  ]
}
```

### Architecture Best Practices for Python Dashboards
- **Expose the Server**: Dash apps must explicitly define `server = app.server` for the Vercel Python runtime to hook into.
- **Statelessness**: Vercel functions are ephemeral. Data should be pulled from APIs or Databases (Supabase/PostgreSQL), not stored in local variables or CSVs that expect to "persist" in memory.
- **Root Directory Awareness**: If the project is part of a monorepo, specify the `rootDirectory` in the planning document so the Vercel Project Settings can be configured correctly.

---

## 4. Common Build Errors & Fixes

### Error: "Cannot find module 'dotenv'"
**Cause:** Debug/test scripts in `src/` directory importing dev dependencies.
**Fix:** Move debug scripts to `scripts/` directory (excluded by `.vercelignore`).

### Error: "Failed to compile" (Linting)
**Cause:** Unescaped entities in JSX (e.g., `"` instead of `&quot;`).
**Fix:** Run `npm run lint` locally to catch issues before pushing.

### Error: "Framework not detected"
**Cause:** Missing framework config files in root directory.
**Fix:** Ensure `next.config.js`, `package.json`, or equivalent exists in root.

### Error: "Build Command exited with 1"
**Cause:** Generic build failure. Check Vercel logs for specific error.
**Fix:** Run `npm run build` locally to reproduce and debug.

---

## 5. Troubleshooting Logic (The "First Response" Guide)

If a deployment fails, the agent should automatically check:

1. **Build Logs**: Is a dependency missing from `package.json` or `requirements.txt`?
2. **Entry Point**: Does the `vercel.json` "destination" match the actual filename (e.g., `app.py` vs `index.py`)?
3. **Environment Variables**: Are the production keys actually saved in the Vercel Dashboard?
4. **Framework Detection**: Is the correct framework preset selected in Vercel settings?
5. **Root Directory**: Is the build running in the correct directory for monorepos?

---

## 6. PRD Efficiency Requirements

Ensure the PRD contains a "Deployment & DevOps" section with the following requirements:

- **Environment Variable Mapping**: List all required `.env` keys (e.g., `DATABASE_URL`, `API_KEY`) so they can be bulk-uploaded to Vercel Settings.
- **Edge Routing**: Define if any redirects or custom headers are needed (to be placed in `vercel.json`).
- **Domain Strategy**: Define the production URL (e.g., `dashboard.yourdomain.com`) to ensure SSL and DNS records are pre-planned.

---

## How to Use This Skill

When you start a new project with Antigravity, you can now simply say:

> *"Analyze my PRD and apply the **Vercel Optimization Skill**. Ensure the file structure, `vercel.json`, and server entry points follow the efficiency standards for a Next.js/Dash deployment."*

When debugging a failed deployment:

> *"Apply the **Vercel Optimization Skill** troubleshooting guide to diagnose this build failure."*

