
// Manually set env vars for debugging
import { config } from 'dotenv';
config({ path: '.env.local' });

// Mock the tools environment
const { tools } = require('./lib/ai/tools');

async function run() {
    console.log('\n--- TEST 1: Find Venue Contact (Google Maps) ---');
    console.log('Testing: "The Red Lion, Cheltenham"');

    try {
        const res1 = await tools.find_venue_contact.execute({
            venueName: "The Red Lion",
            city: "Cheltenham",
            postcode: "GL50"
        });
        console.log('Result 1:', res1);

        if (typeof res1 === 'object' && res1.social_profiles) {
            console.log('\n--- FOUND SOCIAL PROFILES ---');
            console.log(res1.social_profiles);
        }

    } catch (e) {
        console.error('Error 1:', e);
    }

    console.log('\n--- TEST 2: Enrich Instagram (Dunkertons) ---');
    console.log('Testing: "dunkertonscider"');

    try {
        const res2 = await tools.enrich_instagram.execute({
            username: "dunkertonscider"
        });
        console.log('Result 2:', res2);
    } catch (e) {
        console.error('Error 2:', e);
    }
}

run();
