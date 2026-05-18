import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type Client = SupabaseClient<Database>;

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing env var: ${name}. Copy .env.local.example to .env.local and fill it in.`
    );
  }
  return value;
}

/**
 * Public/anon client — safe for use in browser and Server Components.
 * Reads are subject to RLS, so this can only see rows our policies allow.
 */
export function createPublicClient(): Client {
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS. Server-only. Used by scripts and the
 * protected /api/fetch route. Never import this in client code.
 */
export function createServiceClient(): Client {
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
