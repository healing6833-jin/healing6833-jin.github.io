// 고객 생일 → 해당 연·월의 양력 날짜 (음력 생일은 그해 음력 날짜를 양력으로 바꿔서)
import KoreanLunarCalendar from "korean-lunar-calendar";

export type Customer = { name: string; birth: string; lunar: boolean };

function lunarToSolar(ly: number, lm: number, ld: number) {
  const k = new KoreanLunarCalendar();
  // 그해에 30일이 없는 달이면 29일로 (윤달 생일은 평달로 셉니다)
  for (const d of [ld, ld - 1]) if (d > 0 && k.setLunarDate(ly, lm, d, false)) return k.getSolarCalendar();
  return null;
}

export function birthdaysIn(y: number, m: number, list: Customer[]): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  const add = (day: number, label: string) => { (out[day] ??= []).includes(label) || out[day].push(label); };
  for (const c of list) {
    const mm = /^(\d{4})-(\d{2})-(\d{2})/.exec(c.birth);
    if (!mm || !c.name) continue;
    const bm = Number(mm[2]), bd = Number(mm[3]);
    if (!c.lunar) {
      if (bm === m) add(bd, c.name);
      continue;
    }
    // 음력 생일: 양력 m월에 걸칠 수 있는 음력 연도(전해·그해)를 모두 확인
    for (const ly of [y - 1, y]) {
      const s = lunarToSolar(ly, bm, bd);
      if (s && s.year === y && s.month === m) add(s.day, `${c.name}(음 ${bm}.${bd})`);
    }
  }
  return out;
}
