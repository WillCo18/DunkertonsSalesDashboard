const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('Testing connection to:', supabaseUrl);

    const { data: months, error: monthError } = await supabase
        .from('fact_shipments')
        .select('report_month')
        .limit(1);

    if (monthError) {
        console.error('Month Error:', monthError);
    } else {
        console.log('Months data found:', months);
    }

    const { data: products, error: prodError } = await supabase
        .from('dim_product_internal')
        .select('count');

    if (prodError) {
        console.error('Product Error:', prodError);
    } else {
        console.log('Products count:', products);
    }
}

test();
