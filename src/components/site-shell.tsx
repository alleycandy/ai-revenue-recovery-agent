import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "The book" },
  { to: "/counter", label: "Counter" },
  { to: "/gaddi", label: "Gaddi" },
  { to: "/aisle", label: "Aisle" },
  { to: "/pitch", label: "Pitch" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-baseline gap-2">
            <span className="font-display text-xl tracking-tight text-ink">Munim</span>
            <span className="hidden truncate text-xs text-muted sm:inline">
              Rao & Sons · Camp, Pune
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 overflow-x-auto text-sm">
            {LINKS.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "rounded-[8px] px-2.5 py-2 text-muted transition-colors duration-150 hover:text-ink",
                    active && "bg-paper-2 text-ink",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
