import { LayoutGrid, BarChart3, BookOpen, UtensilsCrossed } from "lucide-react";

type Tab = "pos" | "menu" | "reports";

const navItems = [
  { id: "pos", icon: LayoutGrid, label: "POS" },
  { id: "menu", icon: BookOpen, label: "Menu" },
  { id: "reports", icon: BarChart3, label: "Reports" },
] as const;

export function Sidebar({ current, onChange }: { current?: Tab; onChange?: (tab: Tab) => void }) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] w-full items-center justify-between border-t border-border bg-surface/95 px-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(46,46,46,0.08)] backdrop-blur md:static md:h-full md:w-20 md:flex-col md:overflow-hidden md:border-r md:border-t-0 md:px-0 md:py-6 md:pb-6 md:shadow-none">
      {/* Logo — desktop only, pinned at top */}
      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft-md)] md:flex">
        <UtensilsCrossed className="h-6 w-6" />
      </div>

      {/* Nav — mobile: horizontal row | desktop: vertical scrollable column */}
      <nav className="grid flex-1 grid-cols-3 gap-2 md:flex md:min-h-0 md:flex-1 md:flex-col md:gap-3">
        {navItems.map(({ id, icon: Icon, label }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onChange?.(id as Tab)}
              aria-label={label}
              className={`group relative flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ease-[var(--ease-settle)] md:w-12 md:flex-row ${
                active
                  ? "bg-surface-alt text-primary-text"
                  : "text-text-secondary hover:bg-surface-alt hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate md:hidden">{label}</span>
              {active && (
                <span className="absolute inset-x-6 -top-1 h-1 rounded-b-full bg-primary md:-left-3 md:inset-x-auto md:top-1/2 md:h-6 md:w-1 md:-translate-y-1/2 md:rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Avatar — desktop only, pinned at bottom */}
      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt text-sm font-semibold text-foreground md:flex">
        SR
      </div>
    </aside>
  );
}

