import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { formatKRW } from "@/lib/format";

export const Route = createFileRoute("/manager/charge/$id")({
  component: ChargeScreen,
});

interface R { id: string; name: string; balance: number; }

function ChargeScreen() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const [r, setR] = useState<R | null>(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState<{ newBalance: number } | null>(null);

  useEffect(() => {
    supabase.from("restaurants").select("id, name, balance").eq("id", id).single()
      .then(({ data }) => data && setR(data as R));
  }, [id]);

  const num = Number(amount.replace(/[^\d]/g, "")) || 0;

  const doCharge = async () => {
    if (!session || !r) return;
    setConfirmOpen(false);
    const { data, error: err } = await supabase.rpc("charge_restaurant", {
      p_restaurant_id: r.id,
      p_amount: num,
      p_actor_nickname: session.nickname,
      p_memo: memo.trim() || null,
    });
    if (err) {
      setError("충전에 실패했습니다.");
      return;
    }
    const tx = Array.isArray(data) ? data[0] : data;
    setDone({ newBalance: Number(tx?.balance_after ?? r.balance + num) });
  };

  if (!r) {
    return <AppShell title="충전" requireMode="manager"><p className="text-sm text-muted-foreground">불러오는 중...</p></AppShell>;
  }

  if (done) {
    return (
      <AppShell title="충전 완료" requireMode="manager">
        <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
          <p className="text-sm text-success">충전이 완료되었습니다.</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatKRW(done.newBalance)}</p>
          <p className="text-xs text-muted-foreground">{r.name}의 현재 잔액</p>
        </div>
        <div className="mt-4 space-y-2">
          <button onClick={() => navigate({ to: "/manager/restaurants" })} className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">식당 목록으로</button>
          <button onClick={() => { setDone(null); setAmount(""); setMemo(""); }} className="h-12 w-full rounded-xl bg-secondary font-semibold text-secondary-foreground">계속 충전</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="금액 충전" requireMode="manager">
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="text-xs text-muted-foreground">{r.name}</div>
        <div className={`mt-1 text-xl font-bold ${r.balance < 0 ? "text-destructive" : "text-foreground"}`}>
          현재 잔액 {formatKRW(r.balance)}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">충전 금액</label>
          <input
            value={amount}
            inputMode="numeric"
            onChange={(e) => { setAmount(e.target.value.replace(/[^\d]/g, "")); setError(""); }}
            placeholder="0"
            className="h-14 w-full rounded-xl border border-input bg-card px-4 text-right text-2xl font-bold"
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[10000, 50000, 100000, 200000].map((v) => (
              <button key={v} onClick={() => setAmount(String((Number(amount) || 0) + v))}
                className="h-10 rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                +{v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">메모 (선택)</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="충전 사유"
            className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base" />
        </div>

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <button
          onClick={() => {
            if (num <= 0) { setError("0원보다 큰 금액을 입력해주세요."); return; }
            setConfirmOpen(true);
          }}
          className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground"
        >
          충전하기
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`${r.name}에 ${formatKRW(num)}을 충전할까요?`}
        description={`처리 후 잔액: ${formatKRW(r.balance + num)}`}
        confirmLabel="충전"
        onConfirm={doCharge}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppShell>
  );
}
