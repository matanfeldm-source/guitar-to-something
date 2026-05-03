"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadLibrary } from "@/lib/libraryStorage";

export default function SiteNav() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const isMusicMode = /\/library\/[^/]+\/music$/.test(pathname);

  useEffect(() => {
    const bump = () => setCount(loadLibrary().length);
    bump();
    window.addEventListener("guitar-arranger-library", bump);
    return () => window.removeEventListener("guitar-arranger-library", bump);
  }, [pathname]);

  if (isMusicMode) return null;

  const link = (href: string, label: string, badge?: number) => {
    const active =
      href === "/library"
        ? pathname === "/library" || pathname.startsWith("/library/")
        : pathname === href;
    return (
      <Link
        href={href}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-[#5c3d2e] text-[#fff9f0] shadow-md shadow-[rgba(60,40,28,0.2)]"
            : "text-[#3b2418] hover:bg-[#f5ede0]/90 hover:shadow-sm"
        }`}
      >
        {label}
        {badge !== undefined && badge > 0 ? (
          <span className="ml-1.5 inline-flex min-w-[1.125rem] justify-center rounded-full bg-[#1d3557] px-1 py-0.5 text-[10px] font-semibold tabular-nums text-white">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#c9b896]/80 bg-[#fdf6eb]/80 shadow-[0_4px_24px_-8px_rgba(42,28,18,0.12)] backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="group flex items-center gap-2 font-serif text-lg font-semibold leading-tight tracking-tight text-[#2b1810]"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c9b896] bg-gradient-to-br from-[#fff9f0] to-[#ebe4d6] text-base shadow-sm transition group-hover:border-[#8b5a3c]/40 group-hover:shadow"
            aria-hidden
          >
            ♪
          </span>
          <span className="hidden sm:inline">String Arranger</span>
          <span className="sm:hidden">Arranger</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 rounded-full border border-[#dfd3bc]/90 bg-[#f5ede0]/60 p-1">
          {link("/", "Arrange")}
          {link("/library", "Library", count)}
        </nav>
      </div>
    </header>
  );
}
