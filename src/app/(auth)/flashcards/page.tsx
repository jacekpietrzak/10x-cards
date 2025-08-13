import { isFeatureEnabled } from "@/lib/features";
import { redirect } from "next/navigation";
import FlashcardsPageClient from "./FlashcardsPageClient";

export default function FlashcardsPage() {
  if (!isFeatureEnabled("flashcards")) {
    redirect("/");
  }

  return <FlashcardsPageClient />;
}
