
import { ApifyClient } from 'apify-client';

// Initialize client if token is present
const getClient = () => {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) throw new Error("APIFY_API_TOKEN is missing");
    return new ApifyClient({ token });
};

export async function findVenueContact(venueName: string, city: string, postcode?: string, streetAddress?: string | null) {
    const client = getClient();
    const actorId = "compass/crawler-google-places";

    const runActor = async (search: string, label: string) => {
        console.log(`[EnrichmentService] ${label}: ${search}`);
        const run = await client.actor(actorId).call({
            searchStringsArray: [search],
            maxCrawledPlaces: 1,
            language: "en",
            // REMOVED 'country: "GB"' to prevent country-wide crawling
            // Added explicit limiters to force single-result search behavior
            zoom: 15,
            maxImages: 0,
            maxReviews: 0
        });
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items && items.length > 0 ? items[0] : null;
    };

    // Strategy 1: Strict Search (Name + City + Postcode)
    let item = await runActor(`${venueName} ${city} ${postcode || ''}`.trim(), "Strategy 1 (Strict)");
    if (item) return mapResult(item);

    // Strategy 2: Fuzzy Search (Name + City)
    if (postcode) { // Only try if we had a postcode initially (otherwise strict was already fuzzy)
        item = await runActor(`${venueName} ${city}`.trim(), "Strategy 2 (Fuzzy)");
        if (item) return mapResult(item);
    }

    // Strategy 3: Name + Postcode (Skip City)
    if (postcode) {
        item = await runActor(`${venueName} ${postcode}`.trim(), "Strategy 3 (Name + Postcode)");
        if (item) return mapResult(item);
    }

    // Strategy 4: Clean Name Only (fallback)
    const cleanName = venueName
        .replace(/\b(Ltd|Limited|Inn|Hotel|Pub|Bar|Restaurant|The)\b/gi, '')
        .replace(/[^\w\s]/gi, '')
        .trim();

    if (cleanName.length > 3 && cleanName !== venueName) {
        item = await runActor(`${cleanName} ${city}`.trim(), "Strategy 4 (Clean Name + City)");
        if (item) return mapResult(item);
    }

    // Strategy 5: Address + Postcode
    if (streetAddress && postcode) {
        item = await runActor(`${streetAddress} ${postcode}`.trim(), "Strategy 5 (Address + Postcode)");
        if (item) return mapResult(item);
    }

    return null;
}

function mapResult(place: any) {
    return {
        title: place.title,
        address: place.address,
        phone: place.phone,
        website: place.website,
        social_profiles: place.social_profiles,
        rating: place.totalScore,
        reviews: place.reviewsCount,
        maps_url: place.url
    };
}

export async function enrichInstagram(username: string) {
    const client = getClient();
    console.log(`[EnrichmentService] Instagram Search: ${username}`);

    const run = await client.actor("apify/instagram-profile-scraper").call({
        usernames: [username],
        resultsType: "posts",
        searchType: "hashtag",
        searchLimit: 1
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items || items.length === 0) return null;

    const profile = items[0] as any;
    return {
        username: profile.username || username,
        fullName: profile.fullName,
        biography: profile.biography,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        latestPosts: profile.latestPosts ? profile.latestPosts.slice(0, 3).map((p: any) => ({
            caption: p.caption,
            url: p.displayUrl,
            likes: p.likesCount
        })) : []
    };
}
