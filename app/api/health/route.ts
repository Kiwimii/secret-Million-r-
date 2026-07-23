import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "secret-millionaer-blaue-adria",
    supabaseConfigured: isSupabaseConfigured(),
    generatedAt: new Date().toISOString(),
  });
}
