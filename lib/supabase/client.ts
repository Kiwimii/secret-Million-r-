"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "./config";

let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const { url, publishableKey } = getPublicSupabaseConfig();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
