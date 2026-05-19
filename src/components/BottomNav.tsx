import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MapPin, Store, Receipt, Settings } from "lucide-react";
import type { UserMode } from "@/lib/session";

interface Tab {
  to: string;
  label: string;
  icon: typeof Home;
}

const managerTabs: Tab[] = [
  { to: "/manager", label: "홈", icon: Home },
  { to: "/manager/map", label: "지도", icon: MapPin },
  { to: "/manager/restaurants", label: "식당", icon: Store },
  { to: "/manager/history", label: "내역", icon: Receipt },
  { to: "/settings", label: "설정", icon: Settings },
];

const memberTabs: Tab[] = [
  { to: "/member", label: "식당", icon: Store },
  { to: "/member/history", label: "내역", icon: Receipt },
  { to: "/settings", label: "설정", icon: Settings },
];

export function BottomNav({ mode }: { mode: UserMode }) {
  const tabs = mode === "manager" ? managerTabs : memberTabs;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/settings" && pathname.startsWith(to) && to !== "/manager" && to !== "/member")
            || pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
