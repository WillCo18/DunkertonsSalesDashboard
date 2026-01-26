# System Learning Log
Document errors, root causes, and fixes to prevent recurrence.

## 2026-01-26: Apify Actor Input Error
- **Error**: `INVALID INPUT ... searchStringsArray` from `compass/crawler-google-places`.
- **Attempted Fix**: Switched to `apify/google-maps-scraper`.
- **Result**: `Actor with this name was not found`.
- **Root Cause**: Guessing actor names/schemas instead of verifying. Failed to verify actor existence before implementation.
- **Fix**: Verified actor name via `search-actors`. Created local test script `scripts/verify-enrichment.ts` to validate integration before UI deployment.
- **Learning**: never assume Actor names or Inputs. Always use `fetch-actor-details` or `search-actors` first. Always verify 3rd party integrations with a standalone script.

## 2026-01-26: Runaway Scraper Process (Performance)
- **Error**: Verification script hung for >2 minutes; `actor-memory-limit-exceeded` (402).
- **Root Cause**: The actor was configured with `country: "GB"` but no zoom/limit constraints. It attempted to crawl tens of thousands of locations across the entire UK for a single search term.
- **Fix**: Removed `country` parameter. Added `zoom: 15` (local only) and `maxImages/maxReviews: 0` (minimal payload). Created `scripts/cleanup-apify.ts` to kill stuck jobs.
- **Learning**: Always constrain "Crawler" actors. Default behavior often assumes broad data gathering. For specific lookups, enforce strict geographical (Zoom) and quantity limits.
