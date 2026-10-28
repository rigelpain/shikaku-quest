"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient | null = null;

/** ブラウザ用クライアント（シングルトン）。静的サイトなのでセッションは localStorage に持つ。 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase の環境変数（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY）が設定されていません");
  }
  browserClient = createClient(env.url, env.key, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}
