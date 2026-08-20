import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "./environment";

let browserClient: SupabaseClient | null | undefined;

export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const env = getSupabaseEnvironment();
  if (!env) {
    browserClient = null;
    return null;
  }

  browserClient = createClient(env.url, env.publishableKey);
  return browserClient;
}
