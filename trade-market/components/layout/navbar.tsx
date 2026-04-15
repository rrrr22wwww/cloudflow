"use client";

import Link from "next/link";
import { Bell, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClasses, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/marketplace#seller", label: "Seller" },
  { href: "/marketplace#account", label: "Account" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-12 border-b border-border bg-background/80 backdrop-blur transition-all duration-200",
        isScrolled && "shadow-md shadow-black/25 backdrop-blur-lg",
      )}
    >
      <nav
        className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-4 md:px-6"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider"
        >
          <span className="grid h-6 w-6 place-items-center rounded border border-brand/50 bg-brand-muted text-brand">
            CF
          </span>
          <span className="text-foreground">CloudFlow</span>
        </Link>

        <div className="hidden items-center gap-5 text-sm md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-all duration-200 ease-spring hover:text-foreground [font-variation-settings:'wght'_420] hover:[font-variation-settings:'wght'_620]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" aria-label="Search marketplace">
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Notifications">
            <Bell className="h-3.5 w-3.5" />
          </Button>
          <Link
            href="/marketplace#account"
            className={buttonClasses({
              variant: "primary",
              size: "sm",
              className: "gap-1.5",
            })}
          >
            <UserRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open Account</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
