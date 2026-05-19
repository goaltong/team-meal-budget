import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { formatKRW } from "@/lib/format";
import { Store, MapPin } from "lucide-react";

export const Route = createFileRoute("/member/")({
  component: MemberHome,
});

interface R { id: string; name: string; address: string | null; balance: number; status: string; }

function MemberHome() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [list, setList] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase.from("restaurants")
      .select("id, name, address, balance, status")
      .eq("team_id", session.teamId)
      .eq("status", "active")
      .order("name")
      .then(({ data }) => { setList((data ?? []) as R[]); setLoading(false); });
  }, [session]);

  return (
    <AppShell title="식당 선택" requireMode="member">
      <p className="mb-3 text-sm text-muted-foreground">식사한 식당을 선택하고 금액을 입력하세요.</p>

      {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {!loading && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">사용 가능한 식당이 없습니다.</p>
        </div>
      )}

      <div className="space-y-3">
        {list.map((r) => {
          const over = r.balance < 0;
          return (
            <button
              key={r.id}
              onClick={() => navigate({ to: "/member/spend/$id", params: { id: r.id } })}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-bold text-foreground">{r.name}</h3>
                    {over && (
                      <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                        초과 사용 중
                      </span>
                    )}
                  </div>
                  {r.address && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />{r.address}
                    </p>
                  )}
                  <div className={`mt-2 text-lg font-bold ${over ? "text-destructive" : "text-foreground"}`}>
                    {formatKRW(r.balance)}
                  </div>
                </div>
                <div className="rounded-lg bg-member px-3 py-2 text-xs font-bold text-member-foreground">
                  식사 금액<br />입력 →
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
