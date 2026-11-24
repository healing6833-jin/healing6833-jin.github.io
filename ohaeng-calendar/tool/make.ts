// 사용법: (이 폴더에서) npm install && node make.ts 2026 12
// → ../2026-12.png 저장 (공개용: 음력 표시, 고객 정보 없음)
// 사장님용: node make.ts 2026 12 --births 고객.json --out /저장소-밖/경로.png
//   고객.json = [{"name":"홍길동","birth":"1985-03-12","lunar":false}, ...]  ※ 고객 정보 파일·사장님용 달력은 저장소에 올리지 마세요
import { calendarPng } from "./calendar.ts";
import { birthdaysIn } from "./births.ts";
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const [y, m] = args.slice(0, 2).map(Number);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const wasm = readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm");
const bfile = opt("--births");
const births = bfile ? birthdaysIn(y, m, JSON.parse(readFileSync(bfile, "utf8"))) : undefined;
const out = opt("--out") ?? `../${y}-${String(m).padStart(2, "0")}.png`;
if (births && !opt("--out")) throw new Error("고객 생일이 든 달력은 --out 으로 저장소 밖 경로를 지정하세요");
writeFileSync(out, await calendarPng(y, m, wasm, { births }));
console.log("저장:", out, births ? "생일 " + JSON.stringify(births) : "");
