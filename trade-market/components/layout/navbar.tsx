"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/layout/auth-modal";
import { ProfileMenu } from "@/components/layout/profile-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  AUTH_EVENT,
  getStoredSession,
  TOKEN_KEY,
  type StoredSession,
} from "@/lib/auth-session";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/portfolio", label: "Publish" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [session, setSession] = useState<StoredSession>({
    token: "",
    user: null,
  });
  const profileUser = session.user ?? {
    id: "local-session",
    name: "Account",
    email: "Session active",
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncSession = () => setSession(getStoredSession());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === TOKEN_KEY) {
        syncSession();
      }
    };

    syncSession();
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_EVENT, syncSession);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_EVENT, syncSession);
    };
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
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider"
          >
            <span className="grid h-6 w-6 place-items-center rounded border border-brand/50 bg-brand-muted text-brand">
              CF
            </span>
            <span className="text-foreground">CloudFlow</span>
          </Link>
        </div>

        <NavigationMenu className="hidden flex-none md:flex">
          <NavigationMenuList className="gap-1">
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  active={pathname === item.href}
                  render={<Link href={item.href} />}
                  className={cn(
                    "h-8 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider",
                    "[font-variation-settings:'wght'_420] hover:[font-variation-settings:'wght'_620]",
                  )}
                >
                  {item.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" aria-label="Search marketplace">
            <Search className="h-3.5 w-3.5" />
          </Button>
          {/*<Button variant="ghost" size="sm" aria-label="Notifications">
            <Bell className="h-3.5 w-3.5" />
          </Button>*/}
          {session.token ? null : <AuthModal />}
          {session.token ? (
            <ProfileMenu token={session.token} user={profileUser} />
          ) : null}
        </div>
      </nav>
    </header>
  );
}
