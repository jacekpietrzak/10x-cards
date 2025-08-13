import { Logo } from "./Logo";
import { PublicNav } from "./PublicNav";
import type { PublicNavItem } from "@/lib/types";
import { isFeatureEnabled } from "@/lib/features";

const publicNavItems: PublicNavItem[] = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About Us", href: "/#about" },
];

export function PublicHeader() {
  const showAuth = isFeatureEnabled("auth");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />
        <PublicNav navItems={publicNavItems} showAuth={showAuth} />
      </div>
    </header>
  );
}
