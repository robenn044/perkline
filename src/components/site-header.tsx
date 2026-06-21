"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { Logo } from "@/components/logo";
import { ResetButton } from "@/components/reset-button";
import { LogoutButton } from "@/components/logout-button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Role = "employee" | "admin" | "finance" | "provider";

const NAV: Record<Role, { href: string; label: string }[]> = {
  employee: [
    { href: "/employee", label: "Home" },
    { href: "/employee/discover", label: "Discover" },
    { href: "/employee/requests", label: "My Benefits" },
    { href: "/employee/vouchers", label: "Vouchers" },
    { href: "/employee/profile", label: "Profile" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/policy", label: "Budget & Policy" },
    { href: "/admin/catalog", label: "Catalog" },
    { href: "/admin/settlements", label: "Settlements" },
    { href: "/admin/insights", label: "Insights" },
    { href: "/admin/audit", label: "Audit" },
  ],
  finance: [{ href: "/finance", label: "Payouts" }],
  provider: [{ href: "/provider", label: "Console" }],
};

const ROLE_LABEL: Record<Role, string> = {
  employee: "Employee",
  admin: "Company · HR",
  finance: "Finance",
  provider: "Provider",
};

export function SiteHeader({
  role,
  marketLabel = "Tirana · ALL",
  user,
}: {
  role: Role;
  marketLabel?: string;
  user?: { name: string; avatarSeed?: string };
}) {
  const pathname = usePathname();
  const nav = NAV[role];

  function isActive(href: string) {
    const base = href.split("#")[0];
    if (base === "/employee" || base === "/admin") return pathname === base;
    return pathname === base || pathname.startsWith(base + "/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Logo />
        </Link>

        <span className="hidden whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground 2xl:inline-flex">
          {ROLE_LABEL[role]}
        </span>

        <nav aria-label="Primary" className="ml-1 hidden items-center gap-0.5 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/market"
            className="hidden whitespace-nowrap items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary 2xl:inline-flex"
            title="Market & localization config"
          >
            <Globe className="h-3.5 w-3.5" />
            {marketLabel}
          </Link>
          {role !== "provider" && <ResetButton compact />}
          {user && (
            <span className="hidden items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 sm:inline-flex">
              <Avatar name={user.name} seed={user.avatarSeed} size={26} />
              <span className="text-xs font-medium">{user.name.split(" ")[0]}</span>
            </span>
          )}
          {role === "provider" ? (
            <Link href="/login" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
              Sign in
            </Link>
          ) : (
            <LogoutButton />
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav aria-label="Primary" className="container flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar md:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
