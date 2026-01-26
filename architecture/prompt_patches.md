# Prompt Patches
Instructions to update the Master System Prompt based on learnings.

## Patch 001: Third-Party Integration Verification
**Trigger**: When integrating any external API, Actor, or SDK.
**Rule**:
1. NEVER guess resource names or IDs. Use search tools to find exact names.
2. ALWAYS fetch the schema/docs for the specific resource (`fetch-actor-details` for Apify).
3. MANDATORY: Create a minimal standalone script (e.g., `scripts/verify-integration.ts`) to test the connection *before* integrating into the main codebase.
4. "It should work" is not a verification. Run the script.

## Patch 002: Error Handling
**Rule**: UI Error messages must be transparent. If an external tool fails, show the raw error code/type in development mode to speed up debugging (e.g. `ActorNotFound`), rather than generic fallback text.

## Patch 003: Cost & Performance Control
**Trigger**: When using scraping, crawling, or data fetching tools.
**Rule**:
1. CONSTRAINT FIRST: Always apply the strictest possible limits *before* the first run (e.g., `maxItems: 1`, `zoom: 15`, `maxImages: 0`).
2. NEVER launch a "Country-wide" or "Unbounded" crawl for a single record lookup.
3. MEMORY AWARENESS: Be aware of the target environment's limits (e.g., free tier memory). Do not set `memoryMbytes` higher than available.
4. CLEANUP: If a process hangs, assume it is running on the server. Immediately create a cleanup script to abort the remote process.
