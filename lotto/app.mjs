import { TOTAL, WIN_WAYS, parityCount, sumCounts, generate, analyze, koreanDate, dealFortuneCards } from './lottery.mjs';

const $ = id => document.getElementById(id);
const selected = name => document.querySelector(`input[name="${name}"]:checked`).value;
const labels = { uniform: '완전 무작위', balanced: '홀짝 균형', fortune: '운세 숫자' };
const storeKey = 'today-lotto-saved-v1';
const maxSaved = 20;
const fmt = new Intl.NumberFormat('ko-KR');
const dateFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
const dayLabel = date => dateFormat.format(new Date(`${date}T00:00:00Z`));
const percent = count => {
  const rate = count / TOTAL * 100;
  return rate > 0 && rate < 0.01 ? '0.01% 미만' : rate < 100 && rate >= 99.99 ? '99.99% 초과' : `${fmt.format(Math.round(rate * 100) / 100)}%`;
};

const make = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};

const minSum = 21;
const maxSum = 255;
const sumPeak = Math.max(...sumCounts);
const plotX = sum => 3 + (sum - minSum) * 314 / (maxSum - minSum);
const plotY = sum => 40 - 34 * sumCounts[sum] / sumPeak;
const sumArea = `M3,40 ${sumCounts.slice(minSum).map((_, i) => {
  const sum = i + minSum;
  return `L${plotX(sum).toFixed(2)},${plotY(sum).toFixed(2)}`;
}).join(' ')} L317,40 Z`;

function sumChart(sum) {
  const figure = make('figure', undefined, 'sum-chart');
  const caption = make('figcaption', '전체 조합의 합계 분포');
  caption.append(make('strong', `이 조합 ${sum}`));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 320 44');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const area = document.createElementNS(svg.namespaceURI, 'path');
  area.setAttribute('d', sumArea);
  const mark = document.createElementNS(svg.namespaceURI, 'line');
  for (const [name, value] of Object.entries({ x1: plotX(sum), x2: plotX(sum), y1: 3, y2: 40 })) mark.setAttribute(name, value);
  svg.append(area, mark);
  const scale = make('div', undefined, 'chart-scale');
  scale.setAttribute('aria-hidden', 'true');
  scale.append(make('span', '21'), make('span', '138'), make('span', '255'));
  figure.append(caption, svg, scale);
  return figure;
}

function updateDate() {
  const date = koreanDate();
  if ($('today').dateTime === date) return;
  $('today').dateTime = date;
  $('today').textContent = dayLabel(date);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDate(); });
window.addEventListener('pageshow', updateDate);
setInterval(updateDate, 15_000);
updateDate();
$('parity-base').textContent = percent(parityCount(3));
const oddsPercent = (count, digits) => new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: digits }).format(count / TOTAL);
$('win-percent').textContent = `약 ${oddsPercent(WIN_WAYS, 4)}`;
$('first-percent').textContent = `약 ${oddsPercent(1, 8)}`;

const actionMessage = make('p', '', 'action-msg');
actionMessage.hidden = true;
$('output').append(actionMessage);
const announce = message => { $('status').textContent = message; };
function notify(message) {
  actionMessage.hidden = false;
  actionMessage.textContent = message;
  announce(message);
}

let current;
function showResults(batch) {
  const { mode, picks, anchor } = batch;
  const note = make('p', undefined, 'batch-note');
  note.append(`${labels[mode]}${anchor ? ` ${anchor}` : ''} · ${picks.length}개`, make('br'), `같은 회차 1등 확률 `, make('strong', `약 ${oddsPercent(picks.length, 8)}`), ' ', make('span', `(${picks.length} / ${fmt.format(TOTAL)})`, 'odds-fraction'));
  const items = picks.map((pick, index) => {
    const row = make('details', undefined, 'result-row');
    row.open = index === 0;
    const summary = make('summary');
    const balls = make('span', undefined, 'balls');
    pick.forEach(n => {
      const ball = make('span', String(n), 'ball');
      ball.dataset.band = Math.floor((n - 1) / 10);
      if (n === anchor) ball.setAttribute('data-anchor', '');
      balls.append(ball);
    });
    const chevron = make('span', '⌄', 'row-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    const label = make('span', `조합 ${index + 1}`, 'row-label');
    summary.setAttribute('aria-label', `조합 ${index + 1}: ${pick.join(', ')}. 조합 통계`);
    summary.append(label, balls, chevron);
    const stats = analyze(pick);
    const metrics = make('dl', undefined, 'metrics');
    [
      ['홀수 : 짝수', `${stats.odd} : ${6 - stats.odd}`], ['합계', String(stats.sum)],
      ['번호 폭', String(stats.spread)], ['연속 번호', `${stats.consecutive}쌍`],
      ['이 홀짝 비율¹', percent(stats.parityWays)], ['이 합계 이하¹', percent(stats.sumWays)],
    ].forEach(([name, value]) => {
      const metric = make('div');
      metric.append(make('dt', name), make('dd', value));
      metrics.append(metric);
    });
    row.append(summary, metrics, sumChart(stats.sum));
    return row;
  });
  const legend = make('p', '¹ 전체 조합 중 비율 · 당첨 확률이 아니에요.', 'empty-caption');
  $('results').replaceChildren(note, ...items, legend);
  $('results').hidden = false;
  $('empty-caption').hidden = true;
  document.querySelector('.empty-result').hidden = true;
  $('result-actions').hidden = false;
  $('copy-fallback').hidden = true;
  actionMessage.hidden = true;
  $('save').disabled = false;
  announce(`조합 ${picks.length}개를 생성했어요. ${picks.map((pick, i) => `조합 ${i + 1}: ${pick.join(', ')}`).join('. ')}`);
}

function createBatch(mode, anchor) {
  try {
    const picks = generate(mode, Number(selected('count')), anchor);
    current = { mode, picks, anchor, date: koreanDate() };
    showResults(current);
    return true;
  } catch {
    notify('번호를 생성하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.');
    return false;
  }
}

const topics = ['하루 전체', '일과 집중', '사람과 관계'];
const cardButtons = [...document.querySelectorAll('.tarot')];
let deck;
let drawn;
let selectedCard = null;
function shuffleCards(focus = false) {
  try {
    deck = dealFortuneCards();
  } catch {
    $('deck-help').textContent = '카드를 섞지 못했어요. 새로고침한 뒤 다시 시도해 주세요.';
    $('deck-status').textContent = $('deck-help').textContent;
    return;
  }
  selectedCard = null;
  cardButtons.forEach(button => {
    button.disabled = false;
    button.removeAttribute('aria-disabled');
    button.removeAttribute('data-picked');
    button.querySelector('b').textContent = `카드 ${Number(button.dataset.card) + 1}`;
  });
  if (focus) cardButtons[0].focus();
  $('shuffle').hidden = true;
  $('deck-help').textContent = '마음에 드는 카드 한 장을 누르세요.';
  $('deck-status').textContent = focus ? '새 카드를 섞었어요. 한 장을 골라 주세요.' : '';
}

cardButtons.forEach((button, index) => button.addEventListener('click', () => {
  if (!deck || selectedCard !== null) return;
  const reading = deck[index];
  updateDate();
  if (!createBatch('fortune', reading.anchor)) return;
  drawn = reading;
  selectedCard = index;
  $('fortune-topic').textContent = topics[reading.topic];
  $('fortune-heading').textContent = reading.heading;
  $('fortune-line').textContent = reading.line;
  $('anchor-number').textContent = reading.anchor;
  $('fortune-reading').hidden = false;
  $('fortune-sky').hidden = true;
  $('shuffle').hidden = false;
  $('deck-help').textContent = '카드를 열고 번호를 만들었어요.';
  button.dataset.picked = '';
  button.querySelector('b').textContent = `카드 ${index + 1} 열림`;
  button.setAttribute('aria-disabled', 'true');
  for (const other of cardButtons) if (other !== button) other.disabled = true;
  $('deck-status').textContent = `${reading.heading} 운세 숫자 ${reading.anchor}. 조합 ${current.picks.length}개를 만들었어요.`;
}));
$('shuffle').addEventListener('click', () => shuffleCards(true));
shuffleCards();

$('generate').addEventListener('click', () => {
  const mode = selected('mode');
  if (mode === 'fortune' && !drawn) {
    notify('먼저 운세 카드를 한 장 골라 주세요.');
    cardButtons[0].focus();
    return;
  }
  createBatch(mode, mode === 'fortune' ? drawn.anchor : null);
});

$('copy').addEventListener('click', async () => {
  if (!current) return;
  const batch = current;
  const text = batch.picks.map((pick, i) => `조합 ${i + 1}: ${pick.join(', ')}`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    if (batch === current) { $('copy-fallback').hidden = true; notify('번호를 복사했어요.'); }
  } catch {
    if (batch !== current) return;
    $('copy-fallback').hidden = false;
    $('copy-text').value = text;
    $('copy-text').focus();
    $('copy-text').select();
    notify('자동으로 복사할 수 없어요. 선택된 번호를 직접 복사해 주세요.');
  }
});

function readSaved() {
  const data = JSON.parse(localStorage.getItem(storeKey) || '[]');
  if (!Array.isArray(data)) throw new Error('Invalid saved list');
  return data.filter(item => item && typeof item.id === 'string' && Object.hasOwn(labels, item.mode)
    && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(Date.parse(item.date))
    && Array.isArray(item.picks) && [1, 3, 5].includes(item.picks.length) && item.picks.every(pick =>
      Array.isArray(pick) && pick.length === 6 && pick.every((n, i) => Number.isInteger(n) && n >= 1 && n <= 45 && (i === 0 || n > pick[i - 1]))));
}

function renderSaved() {
  let data;
  try { data = readSaved(); }
  catch { $('saved-list').replaceChildren(make('p', '이 브라우저에서 보관함을 열 수 없어요.')); return; }
  $('saved-count').textContent = `${data.length}건`;
  if (!data.length) { $('saved-list').replaceChildren(make('p', '보관한 조합이 없어요. 번호를 만든 뒤 조합 보관을 눌러 보세요.')); return; }
  $('saved-list').replaceChildren(...data.map((item, index) => {
    const article = make('article', undefined, 'saved-item');
    const header = make('header');
    const remove = make('button', '보관 취소');
    remove.type = 'button';
    remove.setAttribute('aria-label', `${index + 1}번째 보관 기록 취소`);
    remove.addEventListener('click', () => {
      if (!window.confirm('이 조합을 보관함에서 지울까요?')) return;
      try {
        const rows = readSaved();
        const position = rows.findIndex(row => row.id === item.id);
        if (position >= 0) { rows.splice(position, 1); localStorage.setItem(storeKey, JSON.stringify(rows)); }
        renderSaved();
        $('saved-list').parentElement.querySelector('summary').focus();
        $('saved-status').textContent = '보관한 조합을 지웠어요.';
      } catch { $('saved-status').textContent = '조합을 지우지 못했어요.'; }
    });
    header.append(make('strong', labels[item.mode]), make('span', `${dayLabel(item.date)} · ${item.picks.length}개`), remove);
    const list = make('ul');
    item.picks.forEach(pick => list.append(make('li', pick.join(', '))));
    article.append(header, list);
    return article;
  }));
}

$('save').addEventListener('click', () => {
  if (!current) return;
  try {
    const rows = readSaved();
    if (rows.length >= maxSaved) { notify('보관함이 가득 찼어요. 기존 기록을 지운 뒤 보관해 주세요.'); return; }
    rows.unshift({ ...current, id: Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-') });
    localStorage.setItem(storeKey, JSON.stringify(rows));
    $('save').disabled = true;
    renderSaved();
    notify('이 브라우저의 보관함에 조합을 저장했어요.');
  } catch { notify('보관하지 못했어요. 전체 복사로 번호를 따로 남겨 주세요.'); }
});
renderSaved();
window.addEventListener('storage', event => { if (event.key === storeKey || event.key === null) renderSaved(); });
