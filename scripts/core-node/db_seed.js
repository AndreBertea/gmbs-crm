// supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Local development URL & anon key
const supabaseUrl = "http://localhost:54321";
const supabaseKey = "anon-key"; // printed by `supabase start`
export const supabase = createClient(supabaseUrl, supabaseKey);
