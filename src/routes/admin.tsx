import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_ID, ADMIN_PW, isAdminAuthed, setAdminAuthed } from "@/lib/admin-session";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Shield, LogOut, Plus, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "총괄 관리자" }] }),
});

interface Team { id: string; name: string; }
interface TeamRow extends Team { restaurantCount: number; }

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAuthed(isAdminAuthed());
    setLoaded(true);
  }, []);

  if (!loaded) return null;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { setAdminAuthed(false); setAuthed(false); }} />;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id === ADMIN_ID && pw === ADMIN_PW) {
      setAdminAuthed(true);
      onSuccess();
    } else {
      setErr("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">총괄 관리자 로그인</h1>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={id} onChange={(e) => { setId(e.target.value); setErr(""); }}
          placeholder="아이디" autoComplete="username"
          className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground"
        />
        <input
          type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }}
          placeholder="비밀번호" autoComplete="current-password"
          className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground"
        />
        {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        <button className="h-12 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground">로그인</button>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [delTarget, setDelTarget] = useState<Team | null>(null);

  const load = async () => {
    const { data: ts } = await supabase.from("teams").select("id, name").order("name");
    const { data: rs } = await supabase.from("restaurants").select("team_id");
    const counts: Record<string, number> = {};
    (rs ?? []).forEach((r) => { counts[r.team_id] = (counts[r.team_id] ?? 0) + 1; });
    setTeams((ts ?? []).map((t) => ({ ...t, restaurantCount: counts[t.id] ?? 0 })));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const n = name.trim();
    if (!n) return setErr("팀 이름을 입력해주세요.");
    setSaving(true); setErr("");
    const { error } = await supabase.from("teams").insert({ name: n });
    setSaving(false);
    if (error) { setErr("추가 실패: " + error.message); return; }
    setName("");
    load();
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    const teamId = delTarget.id;
    // 식당 → 거래내역 함께 삭제
    const { data: rs } = await supabase.from("restaurants").select("id").eq("team_id", teamId);
    const ids = (rs ?? []).map((r) => r.id);
    if (ids.length > 0) {
      await supabase.from("transactions").delete().in("restaurant_id", ids);
      await supabase.from("restaurants").delete().in("id", ids);
    }
    await supabase.from("teams").delete().eq("id", teamId);
    setDelTarget(null);
    load();
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">총괄 관리자</h1>
        </div>
        <button onClick={onLogout} className="flex h-9 items-center gap-1 rounded-lg bg-secondary px-3 text-sm font-semibold text-secondary-foreground">
          <LogOut className="h-4 w-4" /> 로그아웃
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">팀 추가</h2>
        <div className="flex gap-2">
          <input
            value={name} onChange={(e) => { setName(e.target.value); setErr(""); }}
            placeholder="예: 운영팀"
            className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          />
          <button
            disabled={saving} onClick={handleAdd}
            className="flex h-11 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> 추가
          </button>
        </div>
        {err && <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
      </div>

      <h2 className="mt-6 mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Users className="h-4 w-4" /> 팀 목록 ({teams.length})
      </h2>
      <div className="space-y-2">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <div className="font-bold text-foreground">{t.name}</div>
              <div className="text-xs text-muted-foreground">등록 식당 {t.restaurantCount}곳</div>
            </div>
            <button
              onClick={() => setDelTarget(t)}
              className="flex h-9 items-center gap-1 rounded-lg bg-destructive/10 px-3 text-xs font-semibold text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          </div>
        ))}
        {teams.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">팀이 없습니다.</p>
        )}
      </div>

      <ConfirmModal
        open={!!delTarget}
        title="팀을 삭제할까요?"
        description={delTarget ? `'${delTarget.name}' 팀과 해당 팀의 모든 식당·거래내역이 함께 삭제됩니다.` : ""}
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}
