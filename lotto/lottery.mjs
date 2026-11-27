const numbers = Array.from({ length: 45 }, (_, index) => index + 1);
const odds = numbers.filter(n => n % 2);
const evens = numbers.filter(n => n % 2 === 0);

export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - i + 1)) / i;
  return result;
}

export const TOTAL = choose(45, 6);
export const WIN_WAYS = [3, 4, 5, 6].reduce((total, matches) => total + choose(6, matches) * choose(39, 6 - matches), 0);
export const parityCount = odd => choose(23, odd) * choose(22, 6 - odd);

// Reject the short tail of 2^32 so every index has the same number of preimages.
const word = new Uint32Array(1);
function randomIndex(limit) {
  const range = 2 ** 32;
  const cutoff = range - range % limit;
  do { globalThis.crypto.getRandomValues(word); } while (word[0] >= cutoff);
  return word[0] % limit;
}

function sample(from, count) {
  const pool = [...from];
  for (let i = 0; i < count; i++) {
    const j = i + randomIndex(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function generate(mode, count, anchor) {
  if (![1, 3, 5].includes(count) || !['uniform', 'balanced', 'fortune'].includes(mode) || (mode === 'fortune' && !numbers.includes(anchor))) {
    throw new RangeError('Invalid generation options');
  }
  const pool = mode === 'fortune' ? numbers.filter(n => n !== anchor) : numbers;
  const unique = new Map();
  while (unique.size < count) {
    let pick;
    if (mode === 'balanced') pick = [...sample(odds, 3), ...sample(evens, 3)];
    else if (mode === 'fortune') pick = [anchor, ...sample(pool, 5)];
    else pick = sample(pool, 6);
    pick.sort((a, b) => a - b);
    unique.set(pick.join(','), pick);
  }
  return [...unique.values()];
}

// Count each subset once by adding each candidate to subsets of smaller size.
const maxSum = 40 + 41 + 42 + 43 + 44 + 45;
const ways = Array.from({ length: 7 }, () => new Uint32Array(maxSum + 1));
ways[0][0] = 1;
for (const n of numbers) {
  for (let size = 6; size >= 1; size--) {
    for (let sum = n; sum <= maxSum; sum++) ways[size][sum] += ways[size - 1][sum - n];
  }
}
export const sumCounts = Array.from(ways[6]);
const cumulative = [...sumCounts];
for (let i = 1; i <= maxSum; i++) cumulative[i] += cumulative[i - 1];

export function analyze(sorted) {
  const odd = sorted.filter(n => n % 2).length;
  const sum = sorted.reduce((total, n) => total + n, 0);
  return {
    odd, sum, spread: sorted.at(-1) - sorted[0],
    consecutive: sorted.filter((n, i) => i > 0 && n - sorted[i - 1] === 1).length,
    parityWays: parityCount(odd), sumWays: cumulative[sum],
  };
}

const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
export function koreanDate(now = new Date()) {
  const values = Object.fromEntries(calendar.formatToParts(now).map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const fortunes = [
  [
    ['작은 여백이 길을 열어요.', '오늘의 일정에서 딱 10분을 비워 보세요. 그 틈에 자꾸 미뤘던 생각을 가만히 들여다봐도 좋아요.'],
    ['익숙한 길에서 새로움을 찾아요.', '평소에 지나치던 곳을 한 번 살펴보세요. 마음에 드는 장면 하나를 사진 대신 문장으로 남겨 보세요.'],
    ['결정을 잠시 내려놓아도 좋아요.', '급하지 않은 선택 하나는 저녁까지 미뤄 보세요. 지금 할 수 있는 작은 일부터 끝내는 편이 나을 수 있어요.'],
    ['가볍게 시작하면 충분해요.', '완벽한 준비보다 가볍게 해 볼 일을 하나 고르세요. 첫 단계만 끝내고 계속할지는 나중에 정해도 돼요.'],
    ['하루의 속도를 다시 골라요.', '계획보다 지친다면 속도를 늦춰 보세요. 일정을 하나 줄이고 산책할 시간을 남겨도 좋아요.'],
    ['이미 가진 것을 살펴봐요.', '새로 사거나 시작하기 전에 손에 있는 것으로 할 수 있는 일을 하나만 찾아보세요.'],
  ],
  [
    ['할 일보다 끝낼 일을 고르세요.', '가장 오래 마음에 걸린 일에 ‘어디까지 하면 끝인지’를 한 줄로 적고, 첫 20분만 시작해 보세요.'],
    ['생각을 종이 위로 꺼내요.', '머릿속에서 돌아가는 일을 모두 적은 뒤, 오늘 끝낼 일 하나에만 동그라미를 쳐 보세요.'],
    ['첫 번째 초안이면 충분해요.', '완성도를 높이기 전에 누구에게 보여줄 수 있는 초안을 먼저 만들어 보세요.'],
    ['한 번에 하나씩 정리해요.', '다음 15분 동안 알림을 끄고 탭 하나만 열어 두세요. 끝나면 다음에 할 일을 적어요.'],
    ['용건부터 분명하게 적어요.', '보낼 메시지의 첫 문장에 상대가 해야 할 일을 적어 보세요. 설명은 그다음에 붙이면 돼요.'],
    ['쉬는 시간까지 계획해요.', '집중이 계속 끊긴다면 물을 마시고 잠깐 걸어 보세요. 돌아와 해야 할 일 하나만 골라 보세요.'],
  ],
  [
    ['답을 주기 전에 한 번 더 들어요.', '가까운 사람의 이야기에 바로 조언하기보다 어떤 점이 어려웠는지 먼저 물어보세요.'],
    ['먼저 안부를 건네 보세요.', '한동안 연락하지 않았던 사람이 떠오른다면, 긴 설명 없이 안부 한 줄을 보내도 좋아요.'],
    ['마음은 구체적인 말로 전해요.', '고마웠던 순간을 하나 떠올려, 무엇이 왜 고마웠는지 상대에게 한 문장으로 전해 보세요.'],
    ['모든 부탁에 답할 필요는 없어요.', '시간이 필요한 부탁이라면 바로 응하지 말고 언제까지 답을 줄 수 있는지 알려 주세요.'],
    ['추측 대신 짧게 물어봐요.', '뜻이 모호한 말이 마음에 걸린다면 혼자 결론 내리기보다 짧고 차분하게 다시 물어보세요.'],
    ['함께할 작은 제안을 건네요.', '거창한 약속보다 다음에 함께할 산책이나 차 한 잔을 제안해 보세요.'],
  ],
];

const readings = fortunes.flatMap((topicReadings, topic) => topicReadings.map(([heading, line]) => ({ topic, heading, line })));
export function dealFortuneCards() {
  const anchors = sample(numbers, 3);
  return sample(readings, 3).map((reading, slot) => ({ ...reading, anchor: anchors[slot] }));
}
