// 훼이맵 월간 오행 달력 — SVG로 그린 뒤 PNG로 바꿈 (매일 글과 같은 dayInfo 사용)
import { dayInfo, ELEMENTS } from "./ohaeng.ts";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

const W = 1080, H = 1350;
const NAVY = "#14213d", GOLD = "#b08a3e", CREAM = "#fbf6ea";
// 오행 전통 색 (목 청록 · 화 적 · 토 황 · 금 백은 · 수 흑청)
const EL_COLOR = ["#2f7d55", "#c4473a", "#b0812a", "#7d8594", "#1f3f73"];
const EL_TINT = ["#e3f0e6", "#f8e2df", "#f6ecd2", "#eceef2", "#dfe6f2"];
const EL_WORD = ["성장", "열정", "안정", "정리", "휴식"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function calendarSvg(y: number, m: number): string {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rows = Math.ceil((first + days) / 7);
  const x0 = 50, cw = 140, gy = 286, gh = rows > 5 ? 846 : 820, ch = Math.floor(gh / rows);
  const t: string[] = [];
  t.push(`<rect width="${W}" height="${H}" fill="${CREAM}"/>`);
  t.push(`<rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="26" fill="none" stroke="${GOLD}" stroke-opacity=".55" stroke-width="2"/>`);
  t.push(`<text x="${W / 2}" y="92" text-anchor="middle" font-family="Noto Serif KR" font-weight="700" font-size="26" fill="${GOLD}" letter-spacing="6">훼이맵 FATE MAP</text>`);
  t.push(`<text x="${W / 2}" y="168" text-anchor="middle" font-family="Noto Serif KR" font-weight="700" font-size="60" fill="${NAVY}">${y}년 ${m}월 오행 달력</text>`);
  t.push(`<text x="${W / 2}" y="214" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="24" fill="#5a6278">날마다 흐르는 일진(日辰)의 오행과 그날의 추천 오일</text>`);
  const wd = ["일", "월", "화", "수", "목", "금", "토"];
  wd.forEach((w, i) => {
    const c = i === 0 ? "#c4473a" : i === 6 ? "#2c5aa0" : NAVY;
    t.push(`<text x="${x0 + cw * i + cw / 2}" y="${gy - 18}" text-anchor="middle" font-family="Noto Sans KR" font-weight="700" font-size="24" fill="${c}">${w}</text>`);
  });
  for (let d = 1; d <= days; d++) {
    const pos = first + d - 1, r = Math.floor(pos / 7), c = pos % 7;
    const x = x0 + c * cw, yy = gy + r * ch;
    const info = dayInfo(y, m, d);
    const col = EL_COLOR[info.elIndex];
    const dayCol = c === 0 ? "#c4473a" : c === 6 ? "#2c5aa0" : NAVY;
    t.push(`<rect x="${x + 4}" y="${yy + 4}" width="${cw - 8}" height="${ch - 8}" rx="14" fill="${EL_TINT[info.elIndex]}"/>`);
    t.push(`<text x="${x + 16}" y="${yy + (ch < 150 ? 30 : 34)}" font-family="Noto Sans KR" font-weight="700" font-size="${ch < 150 ? 21 : 24}" fill="${dayCol}">${d}</text>`);
    t.push(`<text x="${x + cw - 14}" y="${yy + 32}" text-anchor="end" font-family="Noto Sans KR" font-weight="700" font-size="17" fill="${col}">${info.el.hanja}</text>`);
    // 칸 높이에 맞춰 아래에서부터 배치 (6주인 달은 작게)
    const small = ch < 150;
    const oilY = yy + ch - (small ? 16 : 18);
    const krY = oilY - (small ? 24 : 30);
    const hanY = krY - (small ? 24 : 30);
    t.push(`<text x="${x + cw / 2}" y="${hanY}" text-anchor="middle" font-family="Noto Serif KR" font-weight="700" font-size="${small ? 32 : 40}" fill="${col}">${info.hanja}</text>`);
    t.push(`<text x="${x + cw / 2}" y="${krY}" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="${small ? 15 : 17}" fill="#5a6278">${info.kr}일</text>`);
    t.push(`<text x="${x + cw / 2}" y="${oilY}" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="${info.oil[0].length > 5 ? 15 : small ? 16 : 17}" fill="${NAVY}">${esc(info.oil[0])}</text>`);
  }
  // 범례
  const ly = gy + gh + (rows > 5 ? 36 : 44);
  const lw = (W - 100) / 5;
  ELEMENTS.forEach((el, i) => {
    const cx = 50 + lw * i + lw / 2;
    t.push(`<circle cx="${cx - 62}" cy="${ly - 8}" r="15" fill="${EL_COLOR[i]}"/>`);
    t.push(`<text x="${cx - 62}" y="${ly - 2}" text-anchor="middle" font-family="Noto Sans KR" font-weight="700" font-size="16" fill="#fff">${el.hanja}</text>`);
    t.push(`<text x="${cx - 38}" y="${ly}" font-family="Noto Sans KR" font-weight="700" font-size="22" fill="${NAVY}">${el.name} · ${EL_WORD[i]}</text>`);
    el.oils.forEach((o, j) => t.push(`<text x="${cx}" y="${ly + 34 + j * 24}" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="18" fill="#5a6278">${esc(o[0])}</text>`));
  });
  t.push(`<text x="${W / 2}" y="${H - 58}" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="21" fill="#5a6278">매일 아침 7시 30분 오늘의 오행 아로마 · 텔레그램 채널 t.me/fatemap6833</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${t.join("")}</svg>`;
}

// 구글 폰트에서 달력에 쓰인 글자만 담은 작은 글꼴(TTF)을 받아 옴
async function fontsFor(svg: string): Promise<Uint8Array[]> {
  const chars = [...new Set(svg.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<"))].join("") + "0123456789";
  const out: Uint8Array[] = [];
  for (const fam of ["Noto+Sans+KR:wght@500;700", "Noto+Serif+KR:wght@700"]) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(chars)}`, { headers: { "User-Agent": "Deno/2" } })).text();
    for (const u of css.match(/url\((https:[^)]+)\)/g) ?? []) {
      const res = await fetch(u.slice(4, -1));
      out.push(new Uint8Array(await res.arrayBuffer()));
    }
  }
  if (!out.length) throw new Error("글꼴을 받지 못했습니다");
  return out;
}

let wasmReady: Promise<void> | null = null;
export async function calendarPng(y: number, m: number, wasm?: Uint8Array): Promise<Uint8Array> {
  if (!wasmReady) wasmReady = initWasm(wasm ?? fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
  await wasmReady;
  const svg = calendarSvg(y, m);
  const fontBuffers = await fontsFor(svg);
  const r = new Resvg(svg, { fitTo: { mode: "width", value: W * 2 }, font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Noto Sans KR" } });
  return r.render().asPng();
}
