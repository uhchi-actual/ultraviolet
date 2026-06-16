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
          <stop offset="0%" stopColor="var(--uv-purple-bright)" />
          <stop offset="100%" stopColor="var(--uhchi-secondary)" />
        </linearGradient>
      </defs>
      <path d="M2 12c2 0 2-7 4-7s2 14 4 14 2-14 4-14 2 7 4 7 2-3.5 2-3.5" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-uv-indigo-mid bg-uv-navy">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <WaveIcon />
          <span className="font-display text-lg font-semibold tracking-tight text-uv-text-primary">
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
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "text-uhchi-primary"
                      : "text-uv-text-muted hover:text-uv-text-secondary",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
