import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HistoryItem, type TxRow } from "@/components/HistoryItem";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/member/history")({
  component: MemberHistory,
});

function MemberHistory() {
  const { session } = useSession();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: rs } = await supabase.from("restaurants").select("id, name").eq("team_id", session.teamId);
      const m: Record<string, string> = {};
      (rs ?? []).forEach((r) => { m[r.id] = r.name; });
      setRestaurants(m);

      const { data } = await supabase.from("transactions").select("*")
        .eq("team_id", session.teamId)
        .eq("actor_nickname", session.nickname)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as TxRow[]);
      setLoading(false);
    })();
  }, [session]);

  return (
    <AppShell title="내 사용 내역" requireMode="member">
      <p className="mb-3 text-xs text-muted-foreground">
        별명 “{session?.nickname}”으로 기록된 내역입니다.
      </p>
      {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">아직 사용 내역이 없습니다.</p>}
      <div className="space-y-2">
        {rows.map((tx) => (
          <HistoryItem key={tx.id} tx={tx} restaurantName={restaurants[tx.restaurant_id]} />
        ))}
      </div>
    </AppShell>
  );
}
