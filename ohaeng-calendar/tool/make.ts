// 사용법: (이 폴더에서) npm install && node make.ts 2026 12
// → ../2026-12.png 저장. 날짜별 일진은 lunar_python 만세력과 대조해 확인하세요.
import { calendarPng } from "./calendar.ts";
import { readFileSync, writeFileSync } from "node:fs";
const [y, m] = process.argv.slice(2).map(Number);
const wasm = readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm");
const out = `../${y}-${String(m).padStart(2, "0")}.png`;
writeFileSync(out, await calendarPng(y, m, wasm));
console.log("저장:", out);
