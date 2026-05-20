import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { formatKRW } from "@/lib/format";
import { loadKakao, haversineKm } from "@/lib/kakao";
import { Store, MapPin, Navigation } from "lucide-react";

export const Route = createFileRoute("/member/")({
  component: MemberHome,
});

interface R {
  id: string; name: string; address: string | null;
  balance: number; status: string;
  latitude: number | null; longitude: number | null;
}

function MemberHome() {
  const { session } = useSession();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [mapErr, setMapErr] = useState("");

  useEffect(() => {
    if (!session) return;
    supabase.from("restaurants")
      .select("id, name, address, balance, status, latitude, longitude")
      .eq("team_id", session.teamId)
      .eq("status", "active")
      .order("name")
      .then(({ data }) => { setList((data ?? []) as R[]); setLoading(false); });
  }, [session]);

  // get current location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 },
    );
  }, []);

  // draw kakao map
  useEffect(() => {
    if (list.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const kakao = await loadKakao();
        if (cancelled || !mapRef.current) return;
        const located = list.filter((r) => r.latitude != null && r.longitude != null);
        const center = myLoc
          ? new kakao.maps.LatLng(myLoc.lat, myLoc.lng)
          : located[0]
            ? new kakao.maps.LatLng(located[0].latitude!, located[0].longitude!)
            : new kakao.maps.LatLng(37.5665, 126.978);
        const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });

        const bounds = new kakao.maps.LatLngBounds();
        let hasAny = false;

        // my location marker
        if (myLoc) {
          const pos = new kakao.maps.LatLng(myLoc.lat, myLoc.lng);
          new kakao.maps.Marker({
            position: pos, map,
            image: new kakao.maps.MarkerImage(
              "data:image/svg+xml;utf8," + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="#3b82f6" fill-opacity="0.25"/><circle cx="11" cy="11" r="6" fill="#2563eb" stroke="#fff" stroke-width="2"/></svg>`
              ),
              new kakao.maps.Size(22, 22),
              { offset: new kakao.maps.Point(11, 11) },
            ),
          });
          bounds.extend(pos);
          hasAny = true;
        }

        located.forEach((r) => {
          const pos = new kakao.maps.LatLng(r.latitude!, r.longitude!);
          const over = r.balance < 0;
          const color = over ? "#dc2626" : "#16a34a";
          // marker
          new kakao.maps.Marker({
            position: pos, map,
            image: new kakao.maps.MarkerImage(
              "data:image/svg+xml;utf8," + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.5 0 14.5 0 26 15 40 15 40s15-14 15-25.5C30 6.5 23.3 0 15 0z" fill="${color}"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`
              ),
              new kakao.maps.Size(30, 40),
              { offset: new kakao.maps.Point(15, 40) },
            ),
          });
          // balance overlay
          const content = document.createElement("div");
          content.style.cssText = `transform:translate(-50%,-100%);padding:4px 8px;border-radius:9999px;background:${color};color:#fff;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);margin-bottom:42px;`;
          content.innerText = `${r.name} ${formatKRW(r.balance)}`;
          new kakao.maps.CustomOverlay({ position: pos, content, map, yAnchor: 1 });
          bounds.extend(pos);
          hasAny = true;
        });

        if (hasAny && (located.length > 0 || myLoc)) {
          map.setBounds(bounds);
        }
      } catch (e: any) {
        setMapErr(e?.message || "지도 로드 실패");
      }
    })();
    return () => { cancelled = true; };
  }, [list, myLoc]);

  // sort by distance
  const sorted = (() => {
    if (!myLoc) return list;
    return [...list].sort((a, b) => {
      const da = a.latitude != null && a.longitude != null
        ? haversineKm(myLoc, { lat: a.latitude, lng: a.longitude }) : Infinity;
      const db = b.latitude != null && b.longitude != null
        ? haversineKm(myLoc, { lat: b.latitude, lng: b.longitude }) : Infinity;
      return da - db;
    });
  })();

  return (
    <AppShell title="식당 선택" requireMode="member">
      <div className="relative mb-3">
        <div ref={mapRef} className="h-[240px] w-full overflow-hidden rounded-xl border border-border bg-muted" />
        {mapErr && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/90 p-4 text-center text-xs text-destructive">
            {mapErr}
          </div>
        )}
        {list.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/90 text-xs text-muted-foreground">
            식당이 없습니다
          </div>
        )}
      </div>

      <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Navigation className="h-3 w-3" />
        {myLoc ? "가까운 식당 순으로 정렬됨" : "위치 권한을 허용하면 가까운 순으로 정렬됩니다"}
      </p>

      {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {!loading && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">사용 가능한 식당이 없습니다.</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((r) => {
          const over = r.balance < 0;
          const dist = myLoc && r.latitude != null && r.longitude != null
            ? haversineKm(myLoc, { lat: r.latitude, lng: r.longitude }) : null;
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
                    {dist != null && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
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
