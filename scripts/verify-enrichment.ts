
import { findVenueContact } from '../dashboard/src/lib/services/enrichment';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from dashboard
dotenv.config({ path: path.join(__dirname, '../dashboard/.env.local') });

async function main() {
    console.log("Environment Check:", {
        TOKEN_LEN: process.env.APIFY_API_TOKEN?.length
    });

    try {
        console.log("\n--- TEST: Standard Search ---");
        const res1 = await findVenueContact("The Red Lion", "Cheltenham", "GL50 1AA", null);
        console.log("Result 1:", res1 ? "FOUND" : "NOT FOUND");
        if (res1) console.log(res1.title, res1.address);

    } catch (e: any) {
        console.error("\nCRITICAL ERROR:", e.message);
        console.error(e);
    }
}

main();
