import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { formatKRW } from "@/lib/format";

export const Route = createFileRoute("/member/spend/$id")({
  component: SpendScreen,
});

interface R { id: string; name: string; balance: number; status: string; }
const QUICK = [7000, 8000, 9000, 10000];
const MEMO_PRESETS = ["점심", "저녁", "기타"];

function SpendScreen() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const [r, setR] = useState<R | null>(null);
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState("점심");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ newBalance: number; amount: number } | null>(null);

  useEffect(() => {
    supabase.from("restaurants").select("id, name, balance, status").eq("id", id).single()
      .then(({ data }) => data && setR(data as R));
  }, [id]);

  const doSpend = async () => {
    if (!session || !r) return;
    setConfirmOpen(false);
    const { data, error: err } = await supabase.rpc("spend_restaurant", {
      p_restaurant_id: r.id,
      p_amount: amount,
      p_actor_nickname: session.nickname,
      p_memo: memo || undefined,
    });
    if (err) { setError(err.message.includes("사용할 수 없") ? "사용할 수 없는 식당입니다." : "차감에 실패했습니다."); return; }
    const tx = Array.isArray(data) ? data[0] : data;
    setDone({ newBalance: Number(tx?.balance_after ?? r.balance - amount), amount });
  };

  if (!r) return <AppShell title="식사 금액 입력" requireMode="member"><p className="text-sm text-muted-foreground">불러오는 중...</p></AppShell>;

  if (done) {
    const over = done.newBalance < 0;
    return (
      <AppShell title="차감 완료" requireMode="member">
        <div className={`rounded-2xl p-6 text-center ${over ? "bg-destructive/10 border border-destructive/30" : "bg-success/10 border border-success/30"}`}>
          <p className={`text-sm ${over ? "text-destructive" : "text-success"}`}>
            {formatKRW(done.amount)}이 차감되었습니다.
          </p>
          <p className={`mt-2 text-2xl font-bold ${over ? "text-destructive" : "text-foreground"}`}>
            차감 후 잔액 {formatKRW(done.newBalance)}
          </p>
          {over && <p className="mt-1 text-xs text-destructive">현재 초과 사용 중입니다.</p>}
        </div>
        <div className="mt-4 space-y-2">
          <button onClick={() => navigate({ to: "/member" })} className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">식당 목록으로</button>
          <button onClick={() => navigate({ to: "/member/history" })} className="h-12 w-full rounded-xl bg-secondary font-semibold text-secondary-foreground">내 사용 내역</button>
        </div>
      </AppShell>
    );
  }

  const over = r.balance < 0;
  return (
    <AppShell title="식사 금액 입력" requireMode="member">
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="text-xs text-muted-foreground">{r.name}</div>
        <div className={`mt-1 text-lg font-bold ${over ? "text-destructive" : "text-foreground"}`}>
          현재 잔액 {formatKRW(r.balance)}
        </div>
        {over && <div className="text-xs text-destructive">초과 사용 중 · 그래도 차감할 수 있습니다.</div>}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">사용 금액</label>
          <input
            value={amount === 0 ? "" : amount}
            inputMode="numeric"
            onChange={(e) => { setAmount(Number(e.target.value.replace(/[^\d]/g, "")) || 0); setError(""); }}
            placeholder="0"
            className="h-14 w-full rounded-xl border border-input bg-card px-4 text-right text-2xl font-bold"
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {QUICK.map((v) => (
              <button key={v} onClick={() => setAmount(v)}
                className={`h-12 rounded-lg text-sm font-bold ${amount === v ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">메모</label>
          <div className="flex gap-2">
            {MEMO_PRESETS.map((m) => (
              <button key={m} onClick={() => setMemo(m)}
                className={`h-10 flex-1 rounded-lg text-sm font-semibold ${memo === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <button
          onClick={() => {
            if (amount <= 0) { setError("0원보다 큰 금액을 입력해주세요."); return; }
            setConfirmOpen(true);
          }}
          className="h-14 w-full rounded-xl bg-member text-base font-bold text-member-foreground"
        >
          차감하기
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`${r.name}에서 ${formatKRW(amount)}을 차감할까요?`}
        description={`처리 후 잔액: ${formatKRW(r.balance - amount)}`}
        confirmLabel="차감"
        onConfirm={doSpend}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppShell>
  );
}
