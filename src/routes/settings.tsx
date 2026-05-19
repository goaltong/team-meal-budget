import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { supabase } from "@/integrations/supabase/client";
import { useSession, clearSession, type UserMode } from "@/lib/session";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

interface Team { id: string; name: string; }

function Settings() {
  const { session, update } = useSession();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<UserMode>("member");
  const [resetOpen, setResetOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("teams").select("id, name").order("name").then(({ data }) => setTeams(data ?? []));
  }, []);

  useEffect(() => {
    if (session) {
      setTeamId(session.teamId);
      setNickname(session.nickname);
      setMode(session.mode);
    }
  }, [session]);

  if (!session) return null;

  const save = () => {
    if (!teamId || !nickname.trim()) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    update({ teamId, teamName: team.name, nickname: nickname.trim(), mode });
    setSaved(true);
    setTimeout(() => {
      navigate({ to: mode === "manager" ? "/manager" : "/member" });
    }, 600);
  };

  const reset = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <AppShell title="설정" requireMode={session.mode}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">팀</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">별명</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={10}
            className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">사용 모드</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("manager")}
              className={`h-12 rounded-xl font-semibold ${mode === "manager" ? "bg-manager text-manager-foreground" : "bg-secondary text-secondary-foreground"}`}>
              담당자
            </button>
            <button onClick={() => setMode("member")}
              className={`h-12 rounded-xl font-semibold ${mode === "member" ? "bg-member text-member-foreground" : "bg-secondary text-secondary-foreground"}`}>
              팀원
            </button>
          </div>
        </div>

        {saved && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">저장되었습니다.</p>}

        <button onClick={save} className="h-14 w-full rounded-xl bg-primary font-bold text-primary-foreground">
          변경하기
        </button>

        <button onClick={() => setResetOpen(true)} className="h-12 w-full rounded-xl border border-border bg-card font-semibold text-muted-foreground">
          처음 설정으로 돌아가기
        </button>
      </div>

      <ConfirmModal
        open={resetOpen}
        title="모든 설정을 초기화할까요?"
        description="저장된 팀, 별명, 모드 정보가 삭제됩니다."
        destructive
        confirmLabel="초기화"
        onConfirm={reset}
        onCancel={() => setResetOpen(false)}
      />
    </AppShell>
  );
}
