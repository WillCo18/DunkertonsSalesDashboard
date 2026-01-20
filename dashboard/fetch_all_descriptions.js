const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllDescriptions() {
    const { data, error } = await supabase
        .from('fact_shipments')
        .select('source_description')
        .limit(10000);

    if (error) {
        console.error('Error fetching data:', error);
        process.exit(1);
    }

    // Deduplicate
    const unique = new Set();
    data.forEach(row => {
        if (row.source_description) {
            unique.add(row.source_description);
        }
    });

    // Convert to array of objects for Python script
    const result = Array.from(unique).map(desc => ({ source_description: desc }));
    console.log(JSON.stringify(result, null, 2));
}

fetchAllDescriptions();
