import { createClient } from "@supabase/supabase-js";

// Public (publishable) key: safe in the browser because every table is protected by RLS.
export const SUPABASE_URL = "https://gexatrweunrrnwnhmarf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_C95Oh2V_ZV2V9GVl0UH8gA_hwr1Uq1i";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
