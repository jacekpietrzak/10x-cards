import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Logo } from "./Logo";
import { UserNav } from "./UserNav";
import { HybridMobileNav } from "./HybridMobileNav";
import { Button } from "@/components/ui/button";
import type { PublicNavItem } from "@/lib/types";

const publicNavItems: PublicNavItem[] = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About Us", href: "/#about" },
];

interface HybridHeaderProps {
  user: User;
}

export function HybridHeader({ user }: HybridHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8 ">
          <Logo />
          {/* Navigation to homepage sections */}
          <nav className="hidden md:flex items-center space-x-6">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Quick access to main app functions */}
          <div className="hidden lg:flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/generate">Generate</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/flashcards">My Cards</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/session">Study Session</Link>
            </Button>
          </div>

          <HybridMobileNav />
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}
