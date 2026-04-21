"use client";

import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [nightMode, setNightMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !nightMode);
  }, [nightMode]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[60px] border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="font-[var(--font-pixel)] text-[11px] tracking-[0.22em] text-[var(--color-text)] uppercase">
            VITRUVI
          </span>
          <span className="text-[10px] text-[var(--color-muted-2)]">|</span>
          <span className="hidden sm:block font-[var(--font-syne)] text-[11px] tracking-[0.28em] text-[var(--color-muted)] uppercase">
            INTERIOR
          </span>
        </div>

        <div className="hidden md:flex items-center gap-5">
          <button
            type="button"
            onClick={() => setNightMode((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-hover)] bg-[var(--color-bg)] px-4 py-1.5 text-[10px] tracking-[0.2em] text-[var(--color-text)] transition-colors hover:border-[var(--color-border)]"
            aria-label={nightMode ? "Switch to day mode" : "Switch to night mode"}
          >
            {nightMode ? <Moon size={12} /> : <Sun size={12} />}
            <span className="font-mono uppercase">{nightMode ? "NIGHT" : "DAY"}</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse-soft" />
            <span className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-muted)] uppercase">
              SYSTEM ONLINE
            </span>
          </div>
        </div>

        <button
          type="button"
          className="md:hidden text-[var(--color-muted)]"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div
        className={`fixed top-[60px] left-0 right-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-[220px]" : "max-h-0"
        }`}
      >
        <div className="flex flex-col gap-0 px-6 py-4">
          <button
            type="button"
            onClick={() => setNightMode((prev) => !prev)}
            className="flex items-center gap-2 border-b border-[var(--color-border)] py-3 font-mono text-sm tracking-[0.16em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            {nightMode ? <Moon size={14} /> : <Sun size={14} />}
            {nightMode ? "NIGHT" : "DAY"}
          </button>
          <div className="flex items-center gap-2 py-3 font-mono text-sm tracking-[0.16em] text-[var(--color-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse-soft" />
            SYSTEM ONLINE
          </div>
        </div>
      </div>
    </header>
  );
}
