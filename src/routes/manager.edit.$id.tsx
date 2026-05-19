import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/manager/edit/$id")({
  component: EditRestaurant,
});

function EditRestaurant() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("restaurants").select("name, address, memo").eq("id", id).single()
      .then(({ data }) => {
        if (data) {
          setName(data.name);
          setAddress(data.address ?? "");
          setMemo(data.memo ?? "");
        }
        setLoading(false);
      });
  }, [id]);

  const save = async () => {
    if (!name.trim()) { setError("식당명을 입력해주세요."); return; }
    const { error: err } = await supabase.from("restaurants").update({
      name: name.trim(), address: address.trim() || null, memo: memo.trim() || null,
    }).eq("id", id);
    if (err) { setError("저장에 실패했습니다."); return; }
    navigate({ to: "/manager/restaurants" });
  };

  return (
    <AppShell title="식당 수정" requireMode="manager">
      {loading ? <p className="text-sm text-muted-foreground">불러오는 중...</p> : (
        <div className="space-y-4">
          <Field label="식당명" value={name} onChange={setName} />
          <Field label="주소" value={address} onChange={setAddress} />
          <Field label="메모" value={memo} onChange={setMemo} />
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <button onClick={save} className="h-14 w-full rounded-xl bg-primary font-bold text-primary-foreground">저장</button>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base" />
    </div>
  );
}
