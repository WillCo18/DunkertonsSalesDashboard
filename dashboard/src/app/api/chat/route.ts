import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { tools } from '@/lib/ai/tools';

export const maxDuration = 30;

export async function POST(req: Request) {
   const { messages } = await req.json();

   const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      tools, // <--- Tools registered here
      maxSteps: 5, // <--- Allow multi-step agent loops
      system: `You are "Agent D", the AI analyst for Dunkertons Cider.
    
    CAPABILITIES:
    - You have real-time access to the database via tools.
    - ALWAYS check tools before saying "I don't know".
    - DATA AVAILABILITY: The database contains sales data from JULY 2025 to DECEMBER 2025. If a user asks for 2023 or 2024, politely inform them data starts from July 2025.
    
    DECISION LOGIC:
    1. IF asking about a SPECIFIC PUB/VENUE (e.g. "The Crown", "Red Lion"):
       -> Call 'search_customers' to get the ID.
       -> THEN call 'get_customer_history' or 'get_customer_details'.
    
    2. IF asking about a BRAND or PRODUCT (e.g. "Black Fox sales", "Dunkertons performance"):
       -> Call 'get_monthly_kpis' with 'brandFamily' set to the brand name.
    
    3. IF asking about GAP ANALYSIS (e.g. "Who stocks X but not Y"):
       -> Call 'check_product_gaps'.

    TONE & STYLE:
    - Precise, "Night Ops" aesthetic. 
    - Don't be chatty. Give the data.
    - When listing customers, format them as a markdown list.
    - If you find a "Gap/Opportunity", flag it with 🎯.
    `,
   });

   return result.toDataStreamResponse();
}
