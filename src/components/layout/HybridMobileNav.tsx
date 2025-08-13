"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { PublicNavItem } from "@/lib/types";

const publicNavItems: PublicNavItem[] = [
  { label: "Funkcje", href: "/#features" },
  { label: "Cennik", href: "/#pricing" },
  { label: "O nas", href: "/#about" },
];

interface HybridMobileNavProps {
  showAuth?: boolean;
  showFlashcards?: boolean;
  showAiGeneration?: boolean;
}

export function HybridMobileNav({
  showAuth = true,
  showFlashcards = true,
  showAiGeneration = true,
}: HybridMobileNavProps = {}) {
  const [open, setOpen] = useState(false);

  const appNavItems = [
    ...(showAiGeneration ? [{ label: "Generuj", href: "/generate" }] : []),
    ...(showFlashcards ? [{ label: "Moje fiszki", href: "/flashcards" }] : []),
    ...(showFlashcards ? [{ label: "Sesja nauki", href: "/session" }] : []),
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="md:hidden"
          size="icon"
          aria-label="Toggle Menu"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <div className="flex flex-col space-y-6 py-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg">10xCards</span>
          </div>

          {/* Navigation to homepage sections */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Informacje
            </h3>
            <nav className="flex flex-col space-y-2">
              {publicNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center text-sm font-medium transition-colors hover:text-foreground/80 py-2 px-3 rounded-md text-foreground/60"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Navigation to app functions */}
          {showAuth && appNavItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Aplikacja
              </h3>
              <nav className="flex flex-col space-y-2">
                {appNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center text-sm font-medium transition-colors hover:text-foreground/80 py-2 px-3 rounded-md text-foreground/60"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
