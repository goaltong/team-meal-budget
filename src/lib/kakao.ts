// Kakao Maps JS SDK loader
// 주의: Kakao Maps JS SDK는 일반적으로 "JavaScript 키"를 요구합니다.
// REST API 키만 있는 경우에도 카카오 콘솔에서 "웹" 플랫폼 도메인을 등록하면 동일 키로 동작합니다.
export const KAKAO_APP_KEY = "51846b49d7889576cef2f78a7911a1fc";

let loadPromise: Promise<typeof window.kakao> | null = null;

declare global {
  interface Window {
    kakao: any;
  }
}

export function loadKakao(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.kakao && window.kakao.maps) return Promise.resolve(window.kakao);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("kakao-maps-sdk") as HTMLScriptElement | null;
    const onReady = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("Kakao SDK 로드 실패")));
      return;
    }
    const s = document.createElement("script");
    s.id = "kakao-maps-sdk";
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("Kakao SDK 로드 실패"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
