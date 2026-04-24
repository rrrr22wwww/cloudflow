"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, PencilLine, Send, LogOut, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearStoredSession, type SessionUser } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

interface ProfileMenuProps {
  token: string;
  user: SessionUser;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileMenu({ token, user }: ProfileMenuProps) {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {
      // Local logout should still work even if the backend session is already gone.
    } finally {
      clearStoredSession();
    }
  }

  const avatar = user.img_user;
  const login = user.name || user.email;
  const canManage = user.role === "Creator" || user.role === "Moderator";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 text-[11px] text-foreground",
          "transition-all duration-200 ease-spring hover:border-brand/40 hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        )}
      >
        <span className="grid h-[18px] w-[18px] place-items-center overflow-hidden rounded-full border border-brand/30 bg-brand-muted font-mono text-[9px] text-brand">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            getInitials(login) || "U"
          )}
        </span>
        <span className="hidden max-w-24 truncate font-mono sm:inline">
          {login}
        </span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-popup-open:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 border-border bg-surface-overlay p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1">
            <p className="truncate font-mono text-[11px] text-foreground">
              {login}
            </p>
            <p className="truncate text-[11px] font-normal text-muted-foreground">
              {user.email}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-2 bg-border/70" />
        <DropdownMenuItem
          className="gap-2 rounded-md text-xs text-muted-foreground focus:text-foreground"
          onClick={() => router.push("/portfolio")}
        >
          <Send className="h-3.5 w-3.5" />
          Publish Server
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 rounded-md text-xs text-muted-foreground focus:text-foreground"
          onClick={() => router.push("/profile")}
        >
          <PencilLine className="h-3.5 w-3.5" />
          Edit Profile
        </DropdownMenuItem>
        {canManage ? (
          <DropdownMenuItem
            className="gap-2 rounded-md text-xs text-muted-foreground focus:text-foreground"
            onClick={() => router.push("/admin")}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin Panel
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="gap-2 rounded-md text-xs text-muted-foreground focus:text-foreground"
          onClick={logout}
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
