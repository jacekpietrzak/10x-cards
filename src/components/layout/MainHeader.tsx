import { createClient } from "@/utils/supabase/server";
import { Logo } from "./Logo";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { UserNav } from "./UserNav";
import type { NavItem } from "@/lib/types";
import { isFeatureEnabled } from "@/lib/features";

function getFilteredNavItems(): NavItem[] {
  const allNavItems: NavItem[] = [
    { label: "Generate", href: "/generate" },
    { label: "My Cards", href: "/flashcards" },
    { label: "Study Session", href: "/session" },
  ];

  const aiGenerationEnabled = isFeatureEnabled("aiGeneration");
  const flashcardsEnabled = isFeatureEnabled("flashcards");

  return allNavItems.filter((item) => {
    if (item.href === "/generate") return aiGenerationEnabled;
    if (item.href === "/flashcards" || item.href === "/session")
      return flashcardsEnabled;
    return true;
  });
}

export async function MainHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jeśli nie ma użytkownika, nie renderujemy nawigacji prywatnej
  if (!user) {
    return null;
  }

  const filteredNavItems = getFilteredNavItems();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <Logo />
          <DesktopNav navItems={filteredNavItems} />
        </div>

        <div className="flex items-center space-x-4">
          <MobileNav navItems={filteredNavItems} />
          {isFeatureEnabled("auth") && <UserNav user={user} />}
        </div>
      </div>
    </header>
  );
}
