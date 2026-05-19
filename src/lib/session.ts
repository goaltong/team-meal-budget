import { useEffect, useState, useCallback } from "react";

export type UserMode = "manager" | "member";

export interface Session {
  teamId: string;
  teamName: string;
  nickname: string;
  mode: UserMode;
}

const KEY = "meal-app-session-v1";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setLoaded(true);
  }, []);

  const update = useCallback((s: Session | null) => {
    if (s) saveSession(s);
    else clearSession();
    setSession(s);
  }, []);

  return { session, loaded, update };
}
