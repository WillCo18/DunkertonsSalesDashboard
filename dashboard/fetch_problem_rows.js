
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

async function fetchProblemRows() {
    const { data, error } = await supabase
        .from('fact_shipments')
        .select('source_description, detected_family, detected_format')
        .or('source_description.ilike.%mulled%,source_description.ilike.%dabinett%,source_description.ilike.%dry organic%')
        .limit(1000);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    // Deduplicate based on source_description
    const unique = new Map();
    data.forEach(row => {
        if (!unique.has(row.source_description)) {
            unique.set(row.source_description, row);
        }
    });

    console.log(JSON.stringify(Array.from(unique.values()), null, 2));
}

fetchProblemRows();
