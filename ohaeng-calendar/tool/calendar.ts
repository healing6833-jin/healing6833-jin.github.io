// 훼이맵 월간 오행 달력 — SVG로 그린 뒤 PNG로 바꿈 (매일 글과 같은 dayInfo 사용)
import { dayInfo, ELEMENTS } from "./ohaeng.ts";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import KoreanLunarCalendar from "korean-lunar-calendar";

/** 양력 → 한국천문연구원 기준 음력 { month, day, leap } */
export function lunarOf(y: number, m: number, d: number) {
  const k = new KoreanLunarCalendar();
  k.setSolarDate(y, m, d);
  const l = k.getLunarCalendar();
  return { year: l.year, month: l.month, day: l.day, leap: !!l.intercalation };
}

/** 이 달력에 표시할 옵션: births = { 날짜: ["이름(음 3.5)", ...] } — 사장님용에만 넣기 */
export type CalOpts = { births?: Record<number, string[]> };

const W = 1080, H = 1350;
const NAVY = "#14213d", GOLD = "#b08a3e", CREAM = "#fbf6ea";
// 오행 전통 색 (목 청록 · 화 적 · 토 황 · 금 백은 · 수 흑청)
const EL_COLOR = ["#2f7d55", "#c4473a", "#b0812a", "#7d8594", "#1f3f73"];
const EL_TINT = ["#e3f0e6", "#f8e2df", "#f6ecd2", "#eceef2", "#dfe6f2"];
const EL_WORD = ["성장", "열정", "안정", "정리", "휴식"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function calendarSvg(y: number, m: number, opts: CalOpts = {}): string {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rows = Math.ceil((first + days) / 7);
  const x0 = 50, cw = 140, gy = 286, gh = rows > 5 ? 846 : 820, ch = Math.floor(gh / rows);
  const t: string[] = [];
  t.push(`<rect width="${W}" height="${H}" fill="${CREAM}"/>`);
  t.push(`<rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="26" fill="none" stroke="${GOLD}" stroke-opacity=".55" stroke-width="2"/>`);
  t.push(`<text x="${W / 2}" y="92" text-anchor="middle" font-family="Noto Serif KR" font-weight="700" font-size="26" fill="${GOLD}" letter-spacing="6">훼이맵 FATE MAP</text>`);
  t.push(`<text x="${W / 2}" y="168" text-anchor="middle" font-family="Noto Serif KR" font-weight="700" font-size="60" fill="${NAVY}">${y}년 ${m}월 오행 달력</text>`);
  t.push(`<text x="${W / 2}" y="214" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="24" fill="#5a6278">일진(日辰)의 오행과 추천 오일 · 날짜 옆 작은 숫자는 음력</text>`);
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
    const top = yy + (ch < 150 ? 30 : 34);
    t.push(`<text x="${x + 16}" y="${top}" font-family="Noto Sans KR" font-weight="700" font-size="${ch < 150 ? 21 : 24}" fill="${dayCol}">${d}</text>`);
    // 음력 (음력 초하루는 'O월'로 굵게)
    const lu = lunarOf(y, m, d);
    const lx = x + 16 + (d >= 10 ? (ch < 150 ? 27 : 31) : (ch < 150 ? 15 : 17)) + 6;
    const luText = lu.day === 1 ? `${lu.leap ? "윤" : ""}${lu.month}월` : `${lu.leap ? "윤" : ""}${lu.month}.${lu.day}`;
    t.push(`<text x="${lx}" y="${top - 1}" font-family="Noto Sans KR" font-weight="${lu.day === 1 ? 700 : 500}" font-size="${ch < 150 ? 13 : 14}" fill="${lu.day === 1 ? GOLD : "#8a8f9e"}">${lu.day === 1 ? "음" : ""}${luText}</text>`);
    t.push(`<text x="${x + cw - 14}" y="${yy + 32}" text-anchor="end" font-family="Noto Sans KR" font-weight="700" font-size="17" fill="${col}">${info.el.hanja}</text>`);
    // 칸 높이에 맞춰 아래에서부터 배치 (6주인 달은 작게)
    const small = ch < 150;
    const oilY = yy + ch - (small ? 16 : 18);
    const krY = oilY - (small ? 24 : 30);
    const hanY = krY - (small ? 24 : 30);
    t.push(`<text x="${x + cw / 2}" y="${hanY}" text-anchor="middle" font-family="Noto Serif KR" font-weight="700" font-size="${small ? 32 : 40}" fill="${col}">${info.hanja}</text>`);
    const births = opts.births?.[d];
    if (births?.length) {
      // 생일: 칸에 금색 테두리 + 간지 한글 자리에 이름
      t.push(`<rect x="${x + 5}" y="${yy + 5}" width="${cw - 10}" height="${ch - 10}" rx="13" fill="none" stroke="${GOLD}" stroke-width="3"/>`);
      const who = births.length > 1 ? `${births[0].split("(")[0]} 외 ${births.length - 1}` : births[0].split("(")[0];
      t.push(`<text x="${x + cw / 2}" y="${krY}" text-anchor="middle" font-family="Noto Sans KR" font-weight="700" font-size="${small ? 14 : 15}" fill="${GOLD}">생일 · ${esc(who)}</text>`);
    } else {
      t.push(`<text x="${x + cw / 2}" y="${krY}" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="${small ? 15 : 17}" fill="#5a6278">${info.kr}일</text>`);
    }
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
  const all = Object.entries(opts.births ?? {}).flatMap(([d, ns]) => ns.map((n) => `${d}일 ${n}`));
  if (all.length) {
    const line = all.length > 4 ? all.slice(0, 4).join(" · ") + ` 외 ${all.length - 4}명` : all.join(" · ");
    t.push(`<text x="${W / 2}" y="${H - 58}" text-anchor="middle" font-family="Noto Sans KR" font-weight="700" font-size="${line.length > 48 ? 17 : 20}" fill="${GOLD}">이달의 고객 생일 · ${esc(line)}</text>`);
  } else {
    t.push(`<text x="${W / 2}" y="${H - 58}" text-anchor="middle" font-family="Noto Sans KR" font-weight="500" font-size="21" fill="#5a6278">매일 아침 7시 30분 오늘의 오행 아로마 · 텔레그램 채널 t.me/fatemap6833</text>`);
  }
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
export async function calendarPng(y: number, m: number, wasm?: Uint8Array, opts: CalOpts = {}): Promise<Uint8Array> {
  if (!wasmReady) wasmReady = initWasm(wasm ?? fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
  await wasmReady;
  const svg = calendarSvg(y, m, opts);
  const fontBuffers = await fontsFor(svg);
  const r = new Resvg(svg, { fitTo: { mode: "width", value: W * 2 }, font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Noto Sans KR" } });
  return r.render().asPng();
}
