"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function WaveIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#uv-wave)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="uv-wave" x1="0" y1="0" x2="24" y2="0">
          <stop offset="0%" stopColor="var(--uv-navy)" />
          <stop offset="55%" stopColor="var(--uv-purple-bright)" />
          <stop offset="100%" stopColor="var(--uv-raspberry)" />
        </linearGradient>
      </defs>
      <path d="M2 12c2 0 2-7 4-7s2 14 4 14 2-14 4-14 2 7 4 7 2-3.5 2-3.5" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-14 bg-uv-bg-primary/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <WaveIcon />
          <span className="uv-gradient-text font-display text-lg font-semibold tracking-tight">
            Ultraviolet
          </span>
        </Link>

        <ul className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "text-uv-text-primary"
                      : "text-uv-text-muted hover:text-uv-text-primary",
                  )}
                >
                  {link.label}
                  {active ? (
                    <span className="uv-gradient-bg absolute inset-x-3 -bottom-px h-0.5 rounded-full" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Accent gradient underline for the header (replaces the bright violet bar). */}
      <span className="uv-gradient-bg pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-70" />
    </header>
  );
}
