import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { MapPin, Hand } from "lucide-react";

export const Route = createFileRoute("/manager/map")({
  component: MapAdd,
});

function MapAdd() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [initial, setInitial] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!name.trim()) return setError("식당명을 입력해주세요.");
    if (!session) return;
    const amount = Number(initial || "0");
    if (Number.isNaN(amount) || amount < 0) return setError("초기 충전 금액은 0원 이상이어야 합니다.");

    setSaving(true);
    const { data, error: err } = await supabase
      .from("restaurants")
      .insert({
        team_id: session.teamId,
        name: name.trim(),
        address: address.trim() || null,
        balance: amount,
        memo: memo.trim() || null,
        created_by_nickname: session.nickname,
      })
      .select("id")
      .single();
    setSaving(false);
    if (err || !data) {
      setError("식당 등록에 실패했습니다.");
      return;
    }
    if (amount > 0) {
      await supabase.from("transactions").insert({
        team_id: session.teamId,
        restaurant_id: data.id,
        actor_nickname: session.nickname,
        actor_mode: "manager",
        type: "charge",
        amount,
        balance_after: amount,
        memo: "초기 충전",
      });
    }
    navigate({ to: "/manager/restaurants" });
  };

  return (
    <AppShell title="식당 추가" requireMode="manager">
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center">
        <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold text-foreground">지도 API 연결 예정</p>
        <p className="mt-1 text-xs text-muted-foreground">
          아래에서 식당을 직접 등록할 수 있습니다.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-2">
          <Hand className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">수동 식당 등록</h2>
        </div>

        <Input label="식당명 *" value={name} onChange={setName} placeholder="예: 한식당 A" />
        <Input label="주소" value={address} onChange={setAddress} placeholder="선택 입력" />
        <Input
          label="초기 충전 금액 (원)"
          value={initial}
          onChange={setInitial}
          placeholder="0"
          inputMode="numeric"
        />
        <Input label="메모" value={memo} onChange={setMemo} placeholder="선택 입력" />

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          disabled={saving}
          onClick={handleSave}
          className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? "저장 중..." : "등록하기"}
        </button>
      </div>
    </AppShell>
  );
}

function Input({
  label, value, onChange, placeholder, inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground"
      />
    </div>
  );
}
