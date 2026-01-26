---
name: Vercel Optimization
description: Standards and best practices for architecting Python/Next.js projects for Vercel deployment, including vercel.json configuration and standard project structure.
---

# Skill: Vercel Deployment Optimization & Architecture

## Purpose
To ensure all Python (Dash/Flask) and web projects are architected from the "Planning Stage" to be natively compatible with Vercel's serverless infrastructure, minimizing deployment errors (like NOT_FOUND) and maximizing build efficiency.

## 1. Project Initialization Standards
When starting a new project or drafting a PRD, the agent MUST include the following files in the root directory:

- **`vercel.json`**: The routing brain. Prevents 404/NOT_FOUND errors.
- **`requirements.txt`**: Standardized Python dependencies.
- **`.vercelignore`**: To keep build bundles small (ignore local venv, __pycache__, and .env).

## 2. Infrastructure as Code (The vercel.json Template)
Every project planning phase must generate a `vercel.json` tailored to the framework.

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

## 3. Architecture Best Practices for Python Dashboards
When writing code for the project, follow these "Vercel-Ready" patterns:

- **Expose the Server**: Dash apps must explicitly define `server = app.server` for the Vercel Python runtime to hook into.

- **Statelessness**: Remind the user that Vercel functions are ephemeral. Data should be pulled from APIs or Databases (Supabase/PostgreSQL), not stored in local variables or CSVs that expect to "persist" in memory.

- **Root Directory Awareness**: If the project is part of a monorepo, specify the `rootDirectory` in the planning document so the Vercel Project Settings can be configured correctly.

## 4. PRD Efficiency Requirements
Ensure the PRD contains a "Deployment & DevOps" section with the following requirements:

- **Environment Variable Mapping**: List all required `.env` keys (e.g., `DATABASE_URL`, `API_KEY`) so they can be bulk-uploaded to Vercel Settings.

- **Edge Routing**: Define if any redirects or custom headers are needed (to be placed in `vercel.json`).

- **Domain Strategy**: Define the production URL (e.g., `dashboard.yourdomain.com`) to ensure SSL and DNS records are pre-planned.

## 5. Troubleshooting Logic (The "First Response" Guide)
If a deployment fails, the agent should automatically check:

- **Build Logs**: Is a dependency missing from `requirements.txt`?

- **Entry Point**: Does the `vercel.json` "destination" match the actual filename (e.g., `app.py` vs `index.py`)?

- **Environment Variables**: Are the production keys actually saved in the Vercel Dashboard?


---

### How to use this with your Master Planning Document

When you start a new project with Antigravity, you can now simply say:

> *"Analyze my PRD and apply the **Vercel Optimization Skill**. Ensure the file structure, `vercel.json`, and server entry points follow the efficiency standards for a Dash deployment."*
