export interface PublicSupabaseConfig {
  url: string;
  publishableKey: string;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase ist nicht konfiguriert. NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fehlen.",
    );
  }

  return { url, publishableKey };
}

export function getSupabaseSecretKey(): string {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY fehlt auf dem Server. Der alte SUPABASE_SERVICE_ROLE_KEY wird nur noch als Übergang unterstützt.",
    );
  }

  return secretKey;
}
