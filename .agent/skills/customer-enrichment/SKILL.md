---
name: customer-enrichment
description: Finds contact details (Phone, Website) via Google Maps and deep qualitative data via Instagram, using Apify Actors.
---

# Customer Enrichment Skill

This skill provides capabilities to enrich customer records ("Venues") with public digital footprint data.
It follows a "Waterfall" approach: Data Health (Phone/Web) -> Qualitative Insights (Instagram).

## Core Capabilities

### 1. `find_venue_contact` (Google Maps)
**Objective**: Find the "Must-Have" contact details for a venue.
**Tool**: `compass/crawler-google-places` or `apify/google-maps-scraper`
**Input**:
- `customer_name`: Name of the venue (e.g. "The Red Lion")
- `city`: City (e.g. "Cheltenham")
- `postcode`: Postcode (e.g. "GL50 1AA")
**Output**:
- `phone`: Telephone number
- `website`: Official website URL
- `instagram_url`: Found in social links section
- `maps_url`: Google Maps link
- `rating`: Star rating
- `review_count`: Number of reviews

### 2. `enrich_instagram` (Instagram)
**Objective**: Get the "Vibe Check" - content and audience insights.
**Tool**: `apify/instagram-profile-scraper`
**Condition**: Only run if an Instagram Handle/URL is known or confirmed.
**Input**:
- `username`: Instagram handle (e.g. "dunkertonscider")
**Output**:
- `biography`: Profile bio text
- `followersCount`: Number of followers
- `latestPosts`: Array of top 3 recent posts (Image URL + Caption)

## usage Instructions

### Workflow 1: Zero-Click Discovery
1.  **Search**: Agent constructs query `"{customer_name} {city} {postcode}"`
2.  **Scrape**: Run Google Maps Scraper (Limit 1 result for precision).
3.  **Validate**: Ensure the found address/name loosely matches.
4.  **Save**: Update `dim_customer` with found phone/website.

### Workflow 2: On-Demand Deep Dive
1.  **Trigger**: User requesting "More info" or "Check Instagram".
2.  **Enrich**: Run Instagram Scraper on the handle.
3.  **Display**: Show valid profile card in UI.

## Apify Integration Details

### Google Maps Scraper (`compass/crawler-google-places` recommended)
- **Input JSON**:
  ```json
  {
    "searchStrings": ["The Red Lion Cheltenham GL50 1AA"],
    "maxCrawledPlaces": 1,
    "language": "en",
    "country": "GB"
  }
  ```

### Instagram Scraper (`apify/instagram-profile-scraper`)
- **Input JSON**:
  ```json
  {
    "usernames": ["theredlioncheltenham"],
    "resultsType": "posts",
    "searchType": "hashtag", 
    "searchLimit": 1
  }
  ```
  *(Note: Adjust parameters as per specific Actor schema)*
