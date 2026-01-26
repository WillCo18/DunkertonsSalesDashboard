
// Try to load from dashboard node_modules if local resolution fails
let ApifyClient;
try {
    ApifyClient = require('apify-client').ApifyClient;
} catch (e) {
    try {
        ApifyClient = require('../dashboard/node_modules/apify-client').ApifyClient;
    } catch (e2) {
        console.error("Critical: Could not find apify-client in root or ../dashboard/node_modules");
        process.exit(1);
    }
}
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from dashboard
dotenv.config({ path: path.join(__dirname, '../dashboard/.env.local') });

async function main() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.error("No token found");
        return;
    }
    const client = new ApifyClient({ token });

    console.log("Fetching running acts...");
    try {
        const runs = await client.runs().list({ status: 'RUNNING' });

        console.log(`Found ${runs.items.length} running jobs.`);

        for (const run of runs.items) {
            console.log(`Aborting run: ${run.id} (${run.actId})...`);
            try {
                await client.run(run.id).abort();
                console.log("Aborted.");
            } catch (err) {
                console.log(`Failed to abort ${run.id}: ${err.message}`);
            }
        }
        console.log("Cleanup complete.");
    } catch (err) {
        console.error("Error listing runs:", err.message);
    }
}

main();
