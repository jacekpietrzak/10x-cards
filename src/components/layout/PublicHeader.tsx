import { Logo } from "./Logo";
import { PublicNav } from "./PublicNav";
import type { PublicNavItem } from "@/lib/types";

const publicNavItems: PublicNavItem[] = [
  { label: "Funkcje", href: "/#features" },
  { label: "Cennik", href: "/#pricing" },
  { label: "O nas", href: "/#about" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto space-x-8">
        <Logo />
        <PublicNav navItems={publicNavItems} />
      </div>
    </header>
  );
}
