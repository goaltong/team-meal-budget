import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, type UserMode } from "@/lib/session";
import { Users, UserCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: StartScreen,
  head: () => ({
    meta: [
      { title: "급량비 식당 관리" },
      { name: "description", content: "팀별 급량비 식당과 잔액을 관리하는 내부 장부 앱" },
    ],
  }),
});

interface Team {
  id: string;
  name: string;
}

function StartScreen() {
  const navigate = useNavigate();
  const { session, loaded, update } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<UserMode | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        setTeams(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loaded && session) {
      navigate({ to: session.mode === "manager" ? "/manager" : "/member" });
    }
  }, [loaded, session, navigate]);

  const handleStart = () => {
    if (!teamId) return setError("팀을 선택해주세요.");
    const name = nickname.trim();
    if (!name) return setError("별명을 입력해주세요.");
    if (name.length > 10) return setError("별명은 최대 10자입니다.");
    if (!mode) return setError("사용 모드를 선택해주세요.");

    const team = teams.find((t) => t.id === teamId);
    if (!team) return setError("팀을 선택해주세요.");

    update({ teamId, teamName: team.name, nickname: name, mode });
    navigate({ to: mode === "manager" ? "/manager" : "/member" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <div className="mt-6 mb-8">
        <h1 className="text-3xl font-bold text-foreground">급량비 식당 관리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          로그인 없이 사용하는 내부 급량비 관리용입니다.
        </p>
      </div>

      <div className="space-y-5">
        <Field label="팀 선택">
          <select
            value={teamId}
            onChange={(e) => { setTeamId(e.target.value); setError(""); }}
            className="h-14 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground"
          >
            <option value="">{loading ? "불러오는 중..." : "팀을 선택하세요"}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>

        <Field label="별명 입력">
          <input
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(""); }}
            placeholder="예: 홍반장, 길동"
            maxLength={10}
            className="h-14 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">기록 표시용입니다. 인증 수단이 아닙니다.</p>
        </Field>

        <Field label="사용 모드 선택">
          <div className="grid grid-cols-2 gap-3">
            <ModeButton
              active={mode === "manager"}
              onClick={() => { setMode("manager"); setError(""); }}
              icon={<UserCircle2 className="h-7 w-7" />}
              title="급량비 담당자"
              desc="식당 등록·충전"
              tone="manager"
            />
            <ModeButton
              active={mode === "member"}
              onClick={() => { setMode("member"); setError(""); }}
              icon={<Users className="h-7 w-7" />}
              title="팀원"
              desc="식사 금액 차감"
              tone="member"
            />
          </div>
        </Field>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={handleStart}
          className="mt-2 h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm active:scale-[0.99]"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}

function ModeButton({
  active, onClick, icon, title, desc, tone,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  title: string; desc: string; tone: "manager" | "member";
}) {
  const activeCls = tone === "manager"
    ? "border-manager bg-manager/10 text-manager"
    : "border-member bg-member/10 text-member";
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${
        active ? activeCls : "border-border bg-card text-foreground"
      }`}
    >
      {icon}
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-xs opacity-80">{desc}</div>
      </div>
    </button>
  );
}
