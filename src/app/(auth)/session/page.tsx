import { isFeatureEnabled } from "@/lib/features";
import { redirect } from "next/navigation";
import SessionPageClient from "./SessionPageClient";

export default function SessionPage() {
  if (!isFeatureEnabled("flashcards")) {
    redirect("/");
  }

  return <SessionPageClient />;
}
