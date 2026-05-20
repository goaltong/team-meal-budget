import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { loadKakao } from "@/lib/kakao";
import { formatKRW } from "@/lib/format";
import { MapPin, Search, Crosshair } from "lucide-react";

export const Route = createFileRoute("/manager/map")({
  component: MapAdd,
});

interface Existing { id: string; name: string; latitude: number | null; longitude: number | null; balance: number; }

function MapAdd() {
  const { session } = useSession();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const pickedMarker = useRef<any>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [initial, setInitial] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [mapErr, setMapErr] = useState("");

  // Initialize map
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const kakao = await loadKakao();
        if (cancelled || !mapRef.current) return;
        const center = new kakao.maps.LatLng(37.5665, 126.978);
        const map = new kakao.maps.Map(mapRef.current, { center, level: 4 });
        mapObj.current = map;

        // load existing restaurants
        const { data } = await supabase
          .from("restaurants")
          .select("id, name, latitude, longitude, balance")
          .eq("team_id", session.teamId);
        (data ?? []).forEach((r: Existing) => {
          if (r.latitude == null || r.longitude == null) return;
          const m = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(r.latitude, r.longitude),
            map,
            image: new kakao.maps.MarkerImage(
              "data:image/svg+xml;utf8," + encodeURIComponent(svgPin("#9ca3af")),
              new kakao.maps.Size(28, 36),
              { offset: new kakao.maps.Point(14, 36) },
            ),
          });
          const iw = new kakao.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:12px;">${escapeHtml(r.name)}<br/><b>${formatKRW(Number(r.balance))}</b></div>`,
          });
          kakao.maps.event.addListener(m, "mouseover", () => iw.open(map, m));
          kakao.maps.event.addListener(m, "mouseout", () => iw.close());
        });

        // click to place pin
        kakao.maps.event.addListener(map, "click", (e: any) => {
          const latlng = e.latLng;
          placePin(latlng.getLat(), latlng.getLng());
          // reverse geocode
          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
            if (status === kakao.maps.services.Status.OK) {
              const addr = result[0]?.road_address?.address_name || result[0]?.address?.address_name || "";
              setPicked({ lat: latlng.getLat(), lng: latlng.getLng(), address: addr });
              if (addr && !address) setAddress(addr);
            }
          });
        });

        // try current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            map.setCenter(loc);
          }, () => {}, { timeout: 5000 });
        }
      } catch (e: any) {
        setMapErr(e?.message || "지도 로드 실패");
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  const placePin = (lat: number, lng: number) => {
    const kakao = window.kakao;
    if (!kakao || !mapObj.current) return;
    const latlng = new kakao.maps.LatLng(lat, lng);
    if (pickedMarker.current) pickedMarker.current.setMap(null);
    pickedMarker.current = new kakao.maps.Marker({
      position: latlng,
      map: mapObj.current,
      image: new kakao.maps.MarkerImage(
        "data:image/svg+xml;utf8," + encodeURIComponent(svgPin("#2563eb")),
        new kakao.maps.Size(34, 44),
        { offset: new kakao.maps.Point(17, 44) },
      ),
    });
    setPicked({ lat, lng });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const kakao = window.kakao;
    if (!kakao || !query.trim()) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(query.trim(), (data: any[], status: any) => {
      if (status === kakao.maps.services.Status.OK && data[0]) {
        const p = data[0];
        const lat = Number(p.y), lng = Number(p.x);
        mapObj.current.setCenter(new kakao.maps.LatLng(lat, lng));
        mapObj.current.setLevel(3);
        placePin(lat, lng);
        setPicked({ lat, lng, address: p.road_address_name || p.address_name });
        if (!name) setName(p.place_name);
        if (!address) setAddress(p.road_address_name || p.address_name || "");
      } else {
        setError("검색 결과가 없습니다.");
      }
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const kakao = window.kakao;
      if (!kakao || !mapObj.current) return;
      mapObj.current.setCenter(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
    });
  };

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
        address: address.trim() || picked?.address || null,
        latitude: picked?.lat ?? null,
        longitude: picked?.lng ?? null,
        balance: amount,
        memo: memo.trim() || null,
        created_by_nickname: session.nickname,
      })
      .select("id")
      .single();
    setSaving(false);
    if (err || !data) { setError("식당 등록 실패: " + (err?.message ?? "")); return; }
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
      <p className="mb-2 text-xs text-muted-foreground">지도에서 식당 위치를 탭하거나 검색하여 등록하세요.</p>

      <form onSubmit={handleSearch} className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="식당명 / 주소 검색"
            className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" className="h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">검색</button>
        <button type="button" onClick={useMyLocation} title="내 위치" className="h-11 w-11 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
          <Crosshair className="h-4 w-4" />
        </button>
      </form>

      <div className="relative">
        <div ref={mapRef} className="h-[280px] w-full overflow-hidden rounded-xl border border-border bg-muted" />
        {mapErr && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/90 p-4 text-center text-xs text-destructive">
            {mapErr}
          </div>
        )}
      </div>

      {picked && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
          <MapPin className="h-3.5 w-3.5" />
          선택됨: {picked.address || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <Input label="식당명 *" value={name} onChange={setName} placeholder="예: 한식당 A" />
        <Input label="주소" value={address} onChange={setAddress} placeholder="지도 선택 시 자동 입력" />
        <Input label="초기 충전 금액 (원)" value={initial} onChange={setInitial} placeholder="0" inputMode="numeric" />
        <Input label="메모" value={memo} onChange={setMemo} placeholder="선택 입력" />

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <button
          disabled={saving} onClick={handleSave}
          className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? "저장 중..." : "등록하기"}
        </button>
      </div>
    </AppShell>
  );
}

function Input({ label, value, onChange, placeholder, inputMode }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode}
        className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground"
      />
    </div>
  );
}

function svgPin(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 0C7.6 0 0 7.4 0 16.5 0 28.6 17 44 17 44s17-15.4 17-27.5C34 7.4 26.4 0 17 0z" fill="${color}"/><circle cx="17" cy="16" r="6" fill="#fff"/></svg>`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
