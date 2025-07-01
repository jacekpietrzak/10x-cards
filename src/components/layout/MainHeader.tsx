import { createClient } from "@/utils/supabase/server";
import { Logo } from "./Logo";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { UserNav } from "./UserNav";
import type { NavItem } from "@/lib/types";

const mainNavItems: NavItem[] = [
  { label: "Generate", href: "/generate" },
  { label: "My Cards", href: "/flashcards" },
  { label: "Study Session", href: "/session" },
];

export async function MainHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jeśli nie ma użytkownika, nie renderujemy nawigacji prywatnej
  if (!user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <Logo />
          <DesktopNav navItems={mainNavItems} />
        </div>

        <div className="flex items-center space-x-4">
          <MobileNav navItems={mainNavItems} />
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}
