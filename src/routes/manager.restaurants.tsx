import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { formatKRW } from "@/lib/format";
import { Store, Plus, Wallet, History as HistoryIcon, Power, Edit3, Trash2 } from "lucide-react";

export const Route = createFileRoute("/manager/restaurants")({
  component: ManagerRestaurants,
});

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  balance: number;
  status: string;
  updated_at: string;
}

function ManagerRestaurants() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [list, setList] = useState<Restaurant[]>([]);
  const [monthByR, setMonthByR] = useState<Record<string, number>>({});
  const [lastByR, setLastByR] = useState<Record<string, string>>({});
  const [stopTarget, setStopTarget] = useState<Restaurant | null>(null);
  const [delTarget, setDelTarget] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, address, balance, status, updated_at")
      .eq("team_id", session.teamId)
      .order("created_at", { ascending: false });
    setList((data ?? []) as Restaurant[]);

    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const { data: tx } = await supabase
      .from("transactions")
      .select("restaurant_id, amount, type, created_at")
      .eq("team_id", session.teamId)
      .gte("created_at", startOfMonth.toISOString());
    const m: Record<string, number> = {};
    (tx ?? []).forEach((t) => {
      if (t.type === "spend") m[t.restaurant_id] = (m[t.restaurant_id] ?? 0) + Number(t.amount);
    });
    setMonthByR(m);

    const { data: last } = await supabase
      .from("transactions")
      .select("restaurant_id, created_at")
      .eq("team_id", session.teamId)
      .eq("type", "spend")
      .order("created_at", { ascending: false });
    const l: Record<string, string> = {};
    (last ?? []).forEach((t) => { if (!l[t.restaurant_id]) l[t.restaurant_id] = t.created_at; });
    setLastByR(l);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [session]);

  const handleStop = async () => {
    if (!stopTarget) return;
    const newStatus = stopTarget.status === "active" ? "inactive" : "active";
    await supabase.from("restaurants").update({ status: newStatus }).eq("id", stopTarget.id);
    setStopTarget(null);
    reload();
  };

  return (
    <AppShell
      title="식당 관리"
      requireMode="manager"
      right={
        <button
          onClick={() => navigate({ to: "/manager/map" })}
          className="flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> 추가
        </button>
      }
    >
      {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {!loading && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">등록된 식당이 없습니다.</p>
          <button
            onClick={() => navigate({ to: "/manager/map" })}
            className="mt-3 h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            첫 식당 등록하기
          </button>
        </div>
      )}

      <div className="space-y-3">
        {list.map((r) => {
          const over = r.balance < 0;
          const inactive = r.status !== "active";
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-bold text-foreground">{r.name}</h3>
                    {inactive && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">중지</span>
                    )}
                    {over && (
                      <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">초과 사용</span>
                    )}
                  </div>
                  {r.address && <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.address}</p>}
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">현재 잔액</div>
                  <div className={`text-2xl font-bold ${over ? "text-destructive" : "text-foreground"}`}>
                    {formatKRW(r.balance)}
                  </div>
                  {over && (
                    <div className="text-[11px] text-destructive">초과 사용 {formatKRW(Math.abs(r.balance))}</div>
                  )}
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <div>이번 달 {formatKRW(monthByR[r.id] ?? 0)}</div>
                  {lastByR[r.id] && <div>최근 {new Date(lastByR[r.id]).toLocaleDateString("ko-KR")}</div>}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                <ActionBtn icon={Wallet} label="충전" onClick={() => navigate({ to: "/manager/charge/$id", params: { id: r.id } })} />
                <ActionBtn icon={HistoryIcon} label="내역" onClick={() => navigate({ to: "/manager/history", search: { restaurantId: r.id } as never })} />
                <ActionBtn icon={Edit3} label="수정" onClick={() => navigate({ to: "/manager/edit/$id", params: { id: r.id } })} />
                <ActionBtn
                  icon={Power}
                  label={inactive ? "재개" : "중지"}
                  tone={inactive ? "default" : "warn"}
                  onClick={() => setStopTarget(r)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={!!stopTarget}
        title={stopTarget?.status === "active" ? "이 식당을 사용 중지할까요?" : "이 식당을 다시 사용할까요?"}
        description={stopTarget?.name}
        confirmLabel={stopTarget?.status === "active" ? "중지" : "재개"}
        destructive={stopTarget?.status === "active"}
        onConfirm={handleStop}
        onCancel={() => setStopTarget(null)}
      />
    </AppShell>
  );
}

function ActionBtn({ icon: Icon, label, onClick, tone }: { icon: typeof Store; label: string; onClick: () => void; tone?: "warn" | "default" }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-semibold active:scale-95 ${
        tone === "warn"
          ? "bg-warning/15 text-warning"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
