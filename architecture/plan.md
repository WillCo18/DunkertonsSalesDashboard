# Architecture Plan: "Agent D" (AI Layer)

## 📌 Executive Summary
We are adding an Intelligence Layer to the Dunkertons Sales Dashboard to enable:
1.  **Conversational Analytics**: "Ask your data" interface.
2.  **Proactive Upsell Intelligence**: Automated generation of high-value call lists with talking points.

## 🏗 Tech Stack Selection
- **Framework**: Vercel AI SDK (integrated with Next.js App Router).
- **Model**: OpenAI GPT-4o (Reasoning & SQL generation) or Claude 3.5 Sonnet.
- **Data Access**: 
  - **Primary**: Server-Side Function Calling (Tools) against Supabase.
  - **Fallback**: Controlled Text-to-SQL for ad-hoc queries (Read-Only Postgres Role).

## 🧩 Component Breakdown

### 1. The "Oracle" (Chat Interface)
A floating chat widget (or dedicated "Intelligence" tab) that allows natural language queries.
- **Location**: `src/components/ai/ChatWidget.tsx`
- **Backend**: `src/app/api/chat/route.ts`
- **Capabilities**:
  - "Who stopped buying Black Fox recently?"
  - "Show me top 5 growing accounts in Cheltenham."
  - "Draft an email to [Customer Name] about the new vintage."

### 2. The "Hunter" (Upsell Engine)
An automated reporting engine that runs specific logic to generate "Call Lists".
- **Logic**: Expands on `CrossProductGapAnalysis`.
- **Enrichment**: Uses LLM to generate:
  - **"The Hook"**: Why this customer needs this product *now* (based on their history).
  - **"The Script"**: A 3-bullet talking point list for the sales rep.
- **Output**: A new "Action Center" or "Daily Briefing" page.

## 🚦 Implementation Phases

### Phase 1: Foundation (Vercel AI SDK)
- [ ] Install `ai`, `openai` packages.
- [ ] Configure `API_KEY` in `.env.local`.
- [ ] Build basic `ChatWidget` UI (Streaming text).

### Phase 2: Tool Definitions (The "Brain")
Define tools the AI can use:
- `get_customer_history(account_id)`
- `search_customers(query)`
- `run_gap_analysis(brand, format)`
- `get_stocking_matrix(account_id)`

### Phase 3: The Upsell Report
- [ ] Create `ActionCenter` page.
- [ ] Implement "Opportunity Scoring" (Algorithm + AI).
- [ ] Generate "Call Cards" with AI-written scripts.

## 🛡 Security & Safety
- **Read-Only Access**: The AI will use a specific Supabase role that cannot `INSERT`/`UPDATE` data.
- **Rate Limiting**: Prevent token overuse.
- **Hallucination Guardrails**: Always show the *raw data* citation alongside the AI answer.

## ❓ Discovery Questions (For User)
1.  **API Keys**: Do you have an OpenAI API Key (GPT-4) or Anthropic Key?
2.  **Hosting**: Vercel Serverless functions can timeout on long SQL queries (10s limit on free tier). Are we on Pro?
3.  **Personality**: Should the AI be "Professional Analyst" or "Aggressive Sales Assistant"?
