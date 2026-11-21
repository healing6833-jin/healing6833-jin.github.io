/**
 * 훼이맵 장부 웹앱 — 텔레그램 예약 알림
 * 탈리 문의를 가져올 때(자동 15분마다 · 웹앱 열 때 · 지금 가져오기) 새 상담 신청이 있으면
 * 사장님 텔레그램으로 바로 알려 줍니다. Crm.gs의 importTally가 notifyNewInquiries_를 부릅니다.
 *
 * 봇 토큰과 받을 대화방 번호는 Apps Script [프로젝트 설정 → 스크립트 속성]에만 저장됩니다.
 * 코드나 홈페이지(GitHub)에는 절대 토큰을 적지 마세요.
 */
const TG_TOKEN_PROP = 'TELEGRAM_BOT_TOKEN';
const TG_CHAT_PROP = 'TELEGRAM_CHAT_ID';
const TG_BOT_PROP = 'TELEGRAM_BOT_NAME';
const TG_BULK = 5; // 한 번에 이보다 많이 들어오면(처음 연결 등) 한 통으로 묶어 보냅니다.

function tgProps_() { return PropertiesService.getScriptProperties(); }

/** 텔레그램 봇 API 호출. 실패하면 사람이 읽을 수 있는 오류를 던집니다. */
function tg_(method, payload, token) {
  token = token || tgProps_().getProperty(TG_TOKEN_PROP);
  if (!token) throw new Error('텔레그램 봇이 연결되지 않았습니다. 고객관리 → 설정에서 먼저 연결하세요.');
  const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify(payload || {})
  });
  let body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) { /* 아래에서 처리 */ }
  if (body.ok) return body.result;
  const code = res.getResponseCode();
  if (code === 401 || code === 404) throw new Error('봇 토큰이 맞지 않습니다. BotFather에서 [Copy]한 토큰 전체를 다시 붙여 넣으세요.');
  if (code === 403) throw new Error('봇이 메시지를 보낼 수 없습니다. 텔레그램에서 봇을 차단했다면 풀고 [시작]을 다시 눌러 주세요.');
  if (code === 409) throw new Error('이 봇에 웹훅(Serverless 등)이 걸려 있어 메시지를 읽을 수 없습니다. BotFather에서 웹훅을 끈 뒤 다시 시도하세요.');
  throw new Error('텔레그램 오류: ' + (body.description || ('HTTP ' + code)));
}

function tgEsc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/** 고객관리 화면에 보여 줄 연결 상태 */
function telegramStatus_() {
  const p = tgProps_();
  return { on: !!(p.getProperty(TG_TOKEN_PROP) && p.getProperty(TG_CHAT_PROP)), bot: p.getProperty(TG_BOT_PROP) || '' };
}

/**
 * 토큰을 확인하고, 봇에게 가장 최근에 말을 건 개인 대화방을 알림 받을 곳으로 저장합니다.
 * 먼저 텔레그램에서 봇을 열고 [시작](/start)을 눌러 두어야 합니다.
 */
function connectTelegram(token) {
  token = String(token || '').trim() || tgProps_().getProperty(TG_TOKEN_PROP) || '';
  if (!/^\d{6,}:[\w-]{30,}$/.test(token)) throw new Error('봇 토큰 형식이 아닙니다. BotFather에서 [Copy]한 토큰 전체(숫자:영문)를 붙여 넣으세요.');
  const me = tg_('getMe', {}, token);
  const updates = tg_('getUpdates', { limit: 100, allowed_updates: ['message'] }, token);
  let chat = null;
  updates.forEach(function (u) {
    const m = u.message;
    if (m && m.chat && m.chat.type === 'private') chat = m.chat;
  });
  if (!chat) {
    throw new Error('봇에게 온 메시지가 없습니다. 텔레그램에서 @' + me.username + ' 을 열고 [시작]을 누르거나 아무 말이나 보낸 뒤, 다시 [연결하기]를 누르세요.');
  }
  const p = tgProps_();
  p.setProperty(TG_TOKEN_PROP, token);
  p.setProperty(TG_CHAT_PROP, String(chat.id));
  p.setProperty(TG_BOT_PROP, me.username);
  tg_('sendMessage', {
    chat_id: chat.id, parse_mode: 'HTML',
    text: '🌿 <b>훼이맵 예약 알림이 연결되었어요</b>\n\n' + tgEsc_(chat.first_name || '') + ' 님, 이제 새 상담 신청이 들어오면 이 대화방으로 바로 알려 드릴게요.\n\n' +
      '<i>고객 연락처가 담긴 대화방이니 다른 사람에게 전달하지 마세요.</i>'
  });
  return telegramStatus_();
}

/** 지금 설정으로 시험 알림 한 통을 보냅니다(웹앱 버튼 · 시트 메뉴). */
function testTelegram() {
  sendInquiryAlert_({
    name: '시험 고객', tel: '010-0000-0000', program: '1:1 오행·별자리 아로마 컨설팅', wish: today_(),
    msg: '알림이 잘 오는지 확인하는 시험 메시지예요.', note: '', sign: '물병자리', oil: '유칼립투스', kw: '통찰·확장',
    cust: 'C0000', isNew: true, at: new Date(), test: true
  });
  return true;
}

function disconnectTelegram() {
  const p = tgProps_();
  [TG_TOKEN_PROP, TG_CHAT_PROP, TG_BOT_PROP].forEach(function (k) { p.deleteProperty(k); });
  return telegramStatus_();
}

function crmLink_() {
  try { const u = ScriptApp.getService().getUrl(); return u ? u + '?page=crm' : ''; } catch (e) { return ''; }
}

/** 상담 신청 한 건을 훼이맵 카드 모양 메시지로 보냅니다. */
function sendInquiryAlert_(a) {
  const chat = tgProps_().getProperty(TG_CHAT_PROP);
  if (!chat) throw new Error('알림 받을 대화방이 없습니다. 고객관리 → 설정에서 텔레그램을 연결하세요.');
  const line = '━━━━━━━━━━━━';
  const L = [(a.test ? '🧪 <b>[시험] ' : '🌿 <b>') + '훼이맵 새 상담 신청</b>', line,
    '👤 <b>' + tgEsc_(a.name) + '</b> 님 · ' + tgEsc_(a.tel)];
  if (a.program) L.push('🗂 ' + tgEsc_(a.program));
  if (a.wish) L.push('📅 희망 날짜 ' + tgEsc_(a.wish));
  if (a.sign && a.sign !== NEED_SOLAR) L.push('✨ ' + tgEsc_(a.sign) + ' · ' + tgEsc_(a.oil) + (a.kw ? ' <i>(' + tgEsc_(a.kw) + ')</i>' : ''));
  else if (a.sign) L.push('🌙 음력 생일 — 양력 확인 필요');
  if (a.msg) L.push('💬 ' + tgEsc_(String(a.msg).slice(0, 500)));
  if (a.note) L.push('🃏 ' + tgEsc_(String(a.note).slice(0, 300)));
  L.push(line);
  L.push('🕰 ' + Utilities.formatDate(a.at, tz_(), 'M월 d일 HH:mm') + ' 접수 · ' + tgEsc_(a.cust) + (a.isNew ? ' 신규 고객' : ' 재문의'));
  const msg = { chat_id: chat, parse_mode: 'HTML', text: L.join('\n'), disable_web_page_preview: true };
  const link = crmLink_();
  if (link) msg.reply_markup = { inline_keyboard: [[{ text: '📒 고객관리 열기', url: link }]] };
  tg_('sendMessage', msg);
}

/**
 * importTally가 새 문의를 적은 뒤 부릅니다. 텔레그램이 꺼져 있거나 실패해도 가져오기는 그대로 끝나도록 오류를 삼킵니다.
 * 한 번에 많이 들어오면(처음 연결하며 지난 문의를 가져올 때 등) 한 통으로 묶어 보냅니다.
 */
function notifyNewInquiries_(alerts) {
  if (!alerts || !alerts.length || !telegramStatus_().on) return;
  try {
    if (alerts.length > TG_BULK) {
      const names = alerts.slice(-10).map(function (a) { return '· ' + tgEsc_(a.name) + ' — ' + tgEsc_(a.program || '문의'); });
      const msg = { chat_id: tgProps_().getProperty(TG_CHAT_PROP), parse_mode: 'HTML',
        text: '🌿 <b>훼이맵 문의 ' + alerts.length + '건을 가져왔어요</b>\n' + names.join('\n') +
          (alerts.length > 10 ? '\n…외 ' + (alerts.length - 10) + '건' : '') + '\n\n고객관리 → 문의에서 확인하세요.' };
      const link = crmLink_();
      if (link) msg.reply_markup = { inline_keyboard: [[{ text: '📒 고객관리 열기', url: link }]] };
      tg_('sendMessage', msg);
      return;
    }
    alerts.forEach(sendInquiryAlert_);
  } catch (e) {
    console.error('텔레그램 알림 실패: ' + (e && e.message));
  }
}
