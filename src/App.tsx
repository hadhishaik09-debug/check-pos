import { useState } from "react";

import { MenuGrid } from "./components/pos/MenuGrid";
import { CartPanel } from "./components/pos/CartPanel";
import { Sidebar } from "./components/pos/Sidebar";

import MenuPage from "./pages/MenuPage";
import ReportsPage from "./pages/ReportsPage";


type Tab = "pos" | "menu" | "reports";

export default function App() {
  const [tab, setTab] = useState<Tab>("pos");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col md:flex-row">

        {/* DESKTOP SIDEBAR */}
        <div className="hidden md:flex">
          <Sidebar current={tab} onChange={setTab} />
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto">

          {/* POS */}
          {tab === "pos" && (
            <div className="flex h-full flex-col md:flex-row">

              {/* PRODUCTS */}
              <div className="flex-1 overflow-hidden">
                <MenuGrid />
              </div>

              {/* CART */}
              <aside className="w-full border-t border-border bg-surface md:w-[380px] md:border-l md:border-t-0">
                <CartPanel />
              </aside>
            </div>
          )}

          {/* MENU */}
          {tab === "menu" && <MenuPage />}

          {/* REPORTS */}
          {tab === "reports" && <ReportsPage />}
        </main>

        {/* MOBILE NAVIGATION */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface md:hidden">
          <Sidebar current={tab} onChange={setTab} />
        </div>
      </div>
    </div>
  );
}