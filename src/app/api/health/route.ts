import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Health check DB error:", error.message);
      return NextResponse.json(
        { status: "unhealthy", timestamp: new Date().toISOString() },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { status: "healthy", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
