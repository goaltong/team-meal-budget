import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HistoryItem, type TxRow } from "@/components/HistoryItem";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/manager/history")({
  component: ManagerHistory,
  validateSearch: (s: Record<string, unknown>) => ({
    restaurantId: typeof s.restaurantId === "string" ? s.restaurantId : undefined,
  }),
});

type FilterType = "all" | "charge" | "spend";

function ManagerHistory() {
  const { session } = useSession();
  const search = Route.useSearch();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, string>>({});
  const [rFilter, setRFilter] = useState<string>(search.restaurantId ?? "all");
  const [tFilter, setTFilter] = useState<FilterType>("all");
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase.from("restaurants").select("id, name").eq("team_id", session.teamId)
      .then(({ data }) => {
        const m: Record<string, string> = {};
        (data ?? []).forEach((r) => { m[r.id] = r.name; });
        setRestaurants(m);
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    let q = supabase.from("transactions").select("*").eq("team_id", session.teamId)
      .order("created_at", { ascending: false }).limit(200);
    if (rFilter !== "all") q = q.eq("restaurant_id", rFilter);
    if (tFilter !== "all") q = q.eq("type", tFilter);
    if (nick.trim()) q = q.eq("actor_nickname", nick.trim());
    q.then(({ data }) => { setRows((data ?? []) as TxRow[]); setLoading(false); });
  }, [session, rFilter, tFilter, nick]);

  return (
    <AppShell title="전체 내역" requireMode="manager">
      <div className="space-y-2 mb-3">
        <select value={rFilter} onChange={(e) => setRFilter(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm">
          <option value="all">모든 식당</option>
          {Object.entries(restaurants).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {(["all","charge","spend"] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setTFilter(f)}
              className={`h-9 flex-1 rounded-lg text-xs font-semibold ${tFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {f === "all" ? "전체" : f === "charge" ? "충전" : "차감"}
            </button>
          ))}
        </div>
        <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="별명 필터 (선택)"
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" />
      </div>

      {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">내역이 없습니다.</p>}

      <div className="space-y-2">
        {rows.map((tx) => (
          <HistoryItem key={tx.id} tx={tx} restaurantName={restaurants[tx.restaurant_id]} />
        ))}
      </div>
    </AppShell>
  );
}
