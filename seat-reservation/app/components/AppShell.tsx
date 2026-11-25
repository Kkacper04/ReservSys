"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  LayoutGrid,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";

export interface AppShellUser {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  user?: AppShellUser | null;
  userRole?: string | null;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  maxWidth?: "4xl" | "6xl" | "7xl";
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MAX_WIDTH_CLASS: Record<NonNullable<AppShellProps["maxWidth"]>, string> = {
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export default function AppShell({
  children,
  user,
  userRole,
  title,
  subtitle,
  actions,
  maxWidth = "6xl",
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [fetchedUser, setFetchedUser] = useState<AppShellUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const shouldFetchUser = user === undefined;

  useEffect(() => {
    if (!shouldFetchUser) return;
    let active = true;

    fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AppShellUser | null) => {
        if (active && data) {
          setFetchedUser(data);
        }
      })
      .catch(() => {
        // Unauthenticated requests are handled by individual views
      });

    return () => {
      active = false;
    };
  }, [shouldFetchUser]);

  const resolvedUser = user !== undefined ? user : fetchedUser;
  const resolvedRole = userRole ?? resolvedUser?.role ?? null;
  const isAdmin = resolvedRole === "admin";

  const navItems = [
    { href: "/seats", label: "Book a Desk", icon: LayoutGrid },
    { href: "/dashboard", label: "My Reservations", icon: CalendarCheck },
    ...(isAdmin
      ? [{ href: "/admin", label: "Admin Panel", icon: ShieldCheck }]
      : []),
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/login");
    }
  };

  const containerClass = MAX_WIDTH_CLASS[maxWidth];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#161615]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E4E2DC]">
        <div
          className={`${containerClass} mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-8">
            <Link
              href="/seats"
              className="flex items-center gap-2.5 text-[#161615] hover:opacity-90 transition-opacity"
            >
              <span className="w-8 h-8 rounded-lg bg-[#1B4D3E] text-white flex items-center justify-center font-mono text-xs font-semibold tracking-tight">
                RS
              </span>
              <span className="font-semibold text-base tracking-tight">
                ReservSys
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#ECF4F0] text-[#1B4D3E]"
                        : "text-[#6B6A65] hover:text-[#161615] hover:bg-[#F1EFE9]"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.9} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {(resolvedUser?.name || resolvedRole) && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F7F6F2] border border-[#E4E2DC]">
                {resolvedUser?.name && (
                  <span className="text-xs font-medium text-[#161615] max-w-[160px] truncate">
                    {resolvedUser.name}
                  </span>
                )}
                {resolvedRole && (
                  <span
                    className={`text-[11px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isAdmin
                        ? "bg-[#ECF4F0] text-[#1B4D3E] border border-[#B9D5C9]"
                        : "bg-white text-[#6B6A65] border border-[#E4E2DC]"
                    }`}
                  >
                    {resolvedRole}
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#6B6A65] hover:text-[#9E2A2B] hover:bg-[#FDF1F0] border border-transparent hover:border-[#EFC8C4] transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut size={15} strokeWidth={1.9} />
              <span>{loggingOut ? "Signing out..." : "Logout"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg border border-[#E4E2DC] text-[#161615] hover:bg-[#F1EFE9] cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[#E4E2DC] bg-white px-4 py-3 space-y-2">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-[#ECF4F0] text-[#1B4D3E]"
                        : "text-[#6B6A65] hover:bg-[#F1EFE9] hover:text-[#161615]"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-[#E4E2DC] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#6B6A65]">
                {resolvedUser?.name && (
                  <span className="font-medium text-[#161615]">
                    {resolvedUser.name}
                  </span>
                )}
                {resolvedRole && (
                  <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-[#F7F6F2] border border-[#E4E2DC]">
                    {resolvedRole}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#9E2A2B] bg-[#FDF1F0] border border-[#EFC8C4] cursor-pointer"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className={`flex-1 w-full ${containerClass} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        {(title || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-5 border-b border-[#E4E2DC]">
            <div>
              {title && (
                <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#161615]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-[#6B6A65]">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
