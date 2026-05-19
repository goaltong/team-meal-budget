import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { formatKRW } from "@/lib/format";
import { MapPin, Store, Receipt, ArrowRight, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/manager/")({
  component: ManagerHome,
});

interface Stats {
  count: number;
  totalBalance: number;
  overCount: number;
  overTotal: number;
  todaySpend: number;
  monthSpend: number;
}

function ManagerHome() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id, balance")
        .eq("team_id", session.teamId);

      const r = restaurants ?? [];
      const totalBalance = r.reduce((s, x) => s + Number(x.balance), 0);
      const overRows = r.filter((x) => Number(x.balance) < 0);
      const overTotal = overRows.reduce((s, x) => s + Math.abs(Number(x.balance)), 0);

      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

      const [{ data: today }, { data: month }] = await Promise.all([
        supabase.from("transactions").select("amount")
          .eq("team_id", session.teamId).eq("type", "spend")
          .gte("created_at", startOfDay.toISOString()),
        supabase.from("transactions").select("amount")
          .eq("team_id", session.teamId).eq("type", "spend")
          .gte("created_at", startOfMonth.toISOString()),
      ]);

      setStats({
        count: r.length,
        totalBalance,
        overCount: overRows.length,
        overTotal,
        todaySpend: (today ?? []).reduce((s, x) => s + Number(x.amount), 0),
        monthSpend: (month ?? []).reduce((s, x) => s + Number(x.amount), 0),
      });
    })();
  }, [session]);

  return (
    <AppShell title="담당자 홈" requireMode="manager">
      <div className="rounded-2xl bg-gradient-to-br from-manager to-primary p-5 text-manager-foreground shadow-sm">
        <div className="text-xs opacity-80">전체 잔액</div>
        <div className={`mt-1 text-3xl font-bold ${stats && stats.totalBalance < 0 ? "" : ""}`}>
          {stats ? formatKRW(stats.totalBalance) : "—"}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Mini label="식당" value={stats ? `${stats.count}곳` : "—"} />
          <Mini label="초과 사용 식당" value={stats ? `${stats.overCount}곳` : "—"} />
          <Mini label="오늘 사용" value={stats ? formatKRW(stats.todaySpend) : "—"} />
          <Mini label="이번 달 사용" value={stats ? formatKRW(stats.monthSpend) : "—"} />
        </div>
      </div>

      {stats && stats.overTotal > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-foreground">
            초과 사용 합계 <span className="font-bold">{formatKRW(stats.overTotal)}</span>
          </span>
        </div>
      )}

      <div className="mt-5 space-y-2">
        <ActionRow icon={MapPin} label="지도에서 식당 추가" onClick={() => navigate({ to: "/manager/map" })} />
        <ActionRow icon={Store} label="식당 목록 관리" onClick={() => navigate({ to: "/manager/restaurants" })} />
        <ActionRow icon={Receipt} label="충전/차감 내역" onClick={() => navigate({ to: "/manager/history" })} />
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/15 px-3 py-2 backdrop-blur">
      <div className="text-[11px] opacity-80">{label}</div>
      <div className="mt-0.5 font-bold">{value}</div>
    </div>
  );
}

function ActionRow({ icon: Icon, label, onClick }: { icon: typeof MapPin; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left active:scale-[0.99]"
    >
      <div className="rounded-lg bg-secondary p-2.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="flex-1 font-semibold text-foreground">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
