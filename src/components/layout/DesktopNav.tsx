"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/types";

interface DesktopNavProps {
  navItems: NavItem[];
}

export function DesktopNav({ navItems }: DesktopNavProps) {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center space-x-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground/80",
              isActive ? "text-foreground" : "text-foreground/60",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
