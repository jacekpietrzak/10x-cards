"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PublicNavItem } from "@/lib/types";

interface PublicNavProps {
  navItems: PublicNavItem[];
}

export function PublicNav({ navItems }: PublicNavProps) {
  return (
    <nav className="flex items-center space-x-8">
      {/* Navigation Links */}
      <div className="hidden md:flex items-center space-x-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Zaloguj się</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Zarejestruj się</Link>
        </Button>
      </div>
    </nav>
  );
}
