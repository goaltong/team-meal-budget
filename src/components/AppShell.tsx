import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useSession } from "@/lib/session";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { UserMode } from "@/lib/session";

interface Props {
  children: ReactNode;
  title: string;
  requireMode?: UserMode;
  right?: ReactNode;
}

export function AppShell({ children, title, requireMode, right }: Props) {
  const { session, loaded } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    if (requireMode && session.mode !== requireMode) {
      navigate({ to: session.mode === "manager" ? "/manager" : "/member" });
    }
  }, [loaded, session, requireMode, navigate]);

  if (!loaded || !session) return null;

  const modeLabel = session.mode === "manager" ? "담당자" : "팀원";
  const modeColor = session.mode === "manager" ? "bg-manager text-manager-foreground" : "bg-member text-member-foreground";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${modeColor}`}>{modeLabel}</span>
              <span className="text-muted-foreground">{session.teamName} · {session.nickname}</span>
            </div>
          </div>
          {right}
        </div>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
      <BottomNav mode={session.mode} />
    </div>
  );
}
