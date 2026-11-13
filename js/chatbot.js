/* Verbos 360 — 학습 도우미 챗봇
 * 1) 내장 모드: API 없이 동작 (동사 활용 조회, 활용형 역추적, 문법 규칙·FAQ 안내, 퀴즈)
 * 2) AI 모드: js/config.js 의 SV_CONFIG.chatEndpoint 가 설정되면 AI 선생님이 자유 질문에 답변
 */
(function () {
  const CFG = window.SV_CONFIG || {};
  const AI_URL = (CFG.chatEndpoint || '').trim();
  const T_NAMES = { pres: '현재', pret: '점과거', impf: '불완료과거', fut: '미래', cond: '가정미래', subj: '접속법 현재', isubj: '접속법 과거', cmd: '명령형', pp: '과거분사', ger: '현재분사' };
  const T_SEC = { pres: '4.3', pret: '11.1', impf: '15.1', fut: '16.1', cond: '17.1', subj: '19.1', isubj: '20.1', cmd: '9.1', pp: '18.1', ger: '21.1' };
  const PERS = ['yo', 'tú', 'él/ella/usted', 'nosotros', 'ellos/ustedes'];
  const CMD_P = ['tú (+)', 'usted', 'ustedes', 'tú (−)', 'nosotros'];
  const SAY_P = ['yo', 'tú', 'él', 'nosotros', 'ellos'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const spk = t => (window.SV ? SV.spkBtn(t) : '');
  const secLink = id => { const ch = id.split('.')[0]; return `<a class="cb-link" href="chapter.html?ch=${ch}&s=${id}">📘 ${id} 섹션으로 이동</a>`; };

  let VERBS = null, RULES = null, REV = null, loading = null;
  function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function ensureData() {
    if (VERBS) return Promise.resolve();
    if (!loading) loading = Promise.all([window.VERBS ? 0 : loadScript('data/verbs.js'), window.RULES ? 0 : loadScript('data/rules.js')]).then(() => {
      VERBS = window.VERBS; RULES = window.RULES; REV = {};
      const add = (f, v, t, p) => { if (!f) return; f.split('/').forEach(x => { const w = x.toLowerCase(); (REV[w] = REV[w] || []).push({ v, t, p }); const u = strip(w); if (u !== w) (REV['~' + u] = REV['~' + u] || []).push({ v, t, p }); }); };
      Object.entries(VERBS).forEach(([v, e]) => {
        ['pres', 'pret', 'impf', 'fut', 'cond', 'subj', 'isubj'].forEach(t => e[t].forEach((f, i) => add(f, v, t, i)));
        e.cmd.forEach((f, i) => add(f, v, 'cmd', i));
        add(e.pp, v, 'pp', -1); add(e.ger, v, 'ger', -1);
      });
    });
    return loading;
  }

  /* ---------------- FAQ ---------------- */
  const FAQ = [
    { k: ['ser', 'estar', '차이'], need: ['ser', 'estar'], a: `**ser vs estar** — 둘 다 "~이다"지만 쓰임이 달라요.\n- **ser**: 변하지 않는 본질 — 국적, 직업, 성격, 재료, 시간·날짜 (Soy coreano. Es profesora. Son las tres.)\n- **estar**: 상태·위치·기분 — (Estoy cansado. Madrid está en España.)\n- 팁: "어디에 있다"는 항상 **estar**, 진행형도 **estar** + 현재분사.`, sec: '4.2' },
    { k: ['점과거', '불완료', '차이', 'pretérito', 'imperfecto', '언제'], need: ['점과거|pretérito|preterito', '불완료|imperfecto|반과거'], a: `**점과거 vs 불완료과거**\n- **점과거(Pretérito)**: 한 번 일어나고 끝난 일 — Ayer **comí** paella. (어제 먹었다)\n- **불완료과거(Imperfecto)**: 습관·배경·진행 중이던 일·나이·시간·날씨 — De niño **comía** mucho. (어렸을 때 많이 먹곤 했다)\n- 함께 쓰기: **Estaba** en casa cuando **llamaste**. (집에 있었는데[배경] 네가 전화했다[사건])\n- 단서: ayer, el año pasado, una vez → 점과거 / siempre, todos los días, de niño, mientras → 불완료`, sec: '15.1' },
    { k: ['접속법', '언제', 'subjuntivo', '쓰', '사용'], need: ['접속법|subjuntivo'], a: `**접속법은 언제 쓸까?** 확실하지 않은 일, 바람·감정·의심·명령을 말할 때예요.\n- 구조: 주어1 + 동사 + **que** + 주어2 + **접속법** — Quiero que **vengas**.\n- 기억법 **WEDDINGS**: 소망(querer, ojalá), 감정(alegrarse), 의심(dudar, no creer), 요구(pedir, exigir), 허락·금지, 일반 판단(es importante que), 제안(recomendar)\n- para que, antes de que, sin que 다음에도 접속법!\n- 확신(Creo que, Es cierto que)은 **직설법**.`, sec: '19.1' },
    { k: ['접속법', '과거', '시제', '일치'], need: ['접속법 과거|imperfecto de subjuntivo|시제 일치'], a: `**접속법 과거** 만드는 법: 점과거 ellos형에서 **-ron**을 빼고 -ra, -ras, -ra, -´ramos, -ran.\n- hablaron → **hablara**, tuvieron → **tuviera**, fueron → **fuera**\n- 주절이 과거·가정미래면 접속법 과거: Quería que **vinieras**.\n- 가정문: Si **tuviera** dinero, **viajaría**.`, sec: '20.1' },
    { k: ['명령', '대명사', '위치', '붙', '강세'], need: ['명령|imperativo|mandato'], a: `**명령형과 대명사 위치**\n- 긍정 명령: 동사 **뒤에 붙이고** 강세 표시 — Dímelo. Lávate. Cómpralo.\n- 부정 명령: 동사 **앞에** — No me lo digas. No te laves.\n- nosotros 재귀: s를 빼고 nos — Sentemos → **Sentémonos**, ir → **Vámonos**\n- 불규칙 tú 명령 8개: di, haz, sal, sé, ten, ve, ven, pon`, sec: '9.1' },
    { k: ['gustar', '좋아', '구조'], need: ['gustar|gusta|좋아하'], a: `**gustar 구조**: "좋아하는 대상"이 문법상 주어예요.\n- (A mí) **me gusta** el chocolate. / **Me gustan** los perros. / **Me gusta** bailar.\n- 단수 명사·동사원형 → gusta / 복수 명사 → gustan\n- 사람 이름을 쓸 때도 대명사 필수: **A Ana le** gustan los gatos.\n- 과거: me **gustó** / me **gustaron**`, sec: '24.1' },
    { k: ['재귀', 'reflexivo', 'se'], need: ['재귀|reflexiv'], a: `**재귀동사**는 주어가 자기 자신에게 하는 동작이에요.\n- me lavo, te lavas, se lava, nos lavamos, se lavan\n- 대명사 위치: 활용된 동사 앞 (Me ducho) 또는 동사원형·현재분사 뒤에 붙이기 (Voy a ducharme / Estoy duchándome)\n- 뜻이 바뀌는 동사: dormir 자다 → dormirse 잠들다, ir 가다 → irse 떠나다`, sec: '8.1' },
    { k: ['saber', 'conocer', '차이'], need: ['saber', 'conocer'], a: `**saber vs conocer** — 둘 다 "알다"\n- **saber**: 정보·사실·할 줄 앎 — Sé tu nombre. **Sé nadar.**\n- **conocer**: 사람·장소를 경험으로 앎 — Conozco a Ana. Conozco Madrid.\n- 둘 다 yo형 불규칙: **sé**, **conozco**`, sec: '7.1' },
    { k: ['진행', '하고 있', 'estar', 'gerundio', '현재분사'], need: ['진행|하고 있|하는 중'], a: `**진행형** = estar + 현재분사(-ando / -iendo)\n- 현재진행: **Estoy estudiando.** / 과거진행: **Estaba estudiando.**\n- 불규칙 현재분사: durmiendo, pidiendo, diciendo, leyendo, oyendo, yendo\n- 대명사: Me estoy duchando = Estoy duchándome`, sec: '21.2' },
    { k: ['미래', 'ir a', '할 거'], need: ['ir a|할 거|할 것|가까운 미래'], a: `**미래 표현 두 가지**\n- **ir a + 동사원형** (가까운 미래·계획): Voy a estudiar esta noche.\n- **미래형** (원형 + é, ás, á, emos, án): Estudiaré mañana. — 불규칙: tendré, haré, diré, podré, saldré, vendré…`, sec: '16.1' },
    { k: ['haber', 'hay', '현재완료', 'he'], need: ['현재완료|haber|hay|perfecto'], a: `**haber**\n- **hay** = ~이 있다 (Hay un libro.)\n- **현재완료** = haber + 과거분사: He comido, has visto, ha dicho, hemos hecho, han vuelto\n- 불규칙 분사: abierto, dicho, escrito, hecho, muerto, puesto, roto, visto, vuelto`, sec: '18.2' },
    { k: ['악센트', '입력', '키보드', 'tilde', '강세 부호'], need: ['악센트|입력|키보드|tilde|강세 부호'], a: `**악센트(á é í ó ú ñ) 입력**\n- 이 사이트에서는 입력칸을 누르면 화면 아래에 **악센트 키보드**가 나타나요.\n- 채점할 때 악센트만 틀리면 노란색으로 "악센트 확인"이라고 알려 줘요.`, sec: '' },
    { k: ['사용법', '어떻게', '사이트', '채점', '점수', '진도'], need: ['사용법|사이트|점수|진도|채점'], a: `**사이트 사용법**\n1. 메인에서 챕터·섹션을 고르세요.\n2. 규칙 정리를 읽고, 표의 스페인어를 누르면 발음이 나와요.\n3. 동사표를 채우고 [채점하기] → 틀린 칸에 정답이 표시돼요.\n4. 연습문제 A, B…를 풀고 채점! 최고 점수가 자동 저장돼요.\n5. ⚡ 스피드 드릴로 빠르게 복습해 보세요.`, sec: '' },
  ];

  /* ---------------- parsing helpers ---------------- */
  const TENSE_RX = [
    ['isubj', /접속법\s*과거|과거\s*접속법|imperfecto de subjuntivo|subjuntivo pasado|past subjunctive/i],
    ['subj', /접속법|subjuntivo|subjunctive/i],
    ['ger', /현재분사|gerundio|gerund|진행/i],
    ['pp', /과거분사|participio|participle|완료/i],
    ['impf', /불완료|반과거|imperfecto|imperfect/i],
    ['cond', /가정미래|조건법|조건|condicional|conditional/i],
    ['fut', /미래|futuro|future/i],
    ['cmd', /명령|imperativo|mandato|command/i],
    ['pret', /점과거|단순과거|과거|pretérito|preterito|preterite|past/i],
    ['pres', /현재|presente|present/i],
  ];
  function detectTense(q) { for (const [t, rx] of TENSE_RX) if (rx.test(q)) return t; return null; }
  function detectPerson(q) {
    const s = ' ' + q.toLowerCase() + ' ';
    if (/\s(nosotros|nosotras|우리)\s/.test(s)) return 3;
    if (/\s(ellos|ellas|ustedes|그들|여러분)\s/.test(s)) return 4;
    if (/\s(él|el|ella|usted|그는|그녀)\s/.test(s)) return 2;
    if (/\s(tú|tu|너)\s/.test(s)) return 1;
    if (/\s(yo|나는|내가)\s/.test(s)) return 0;
    return null;
  }
  function words(q) {
    return q.toLowerCase().replace(/[¿?¡!.,;:"'()]/g, ' ').split(/\s+/).map(w => w.replace(/[가-힣]+$/g, '')).filter(w => /^[a-záéíóúüñ]{2,}$/.test(w));
  }
  const STOP = new Set(['ser', 'estar']); // handled as verbs normally; kept for FAQ priority

  function regularGuess(v) {
    const m = v.match(/^(.+?)(ar|er|ir)$/); if (!m) return null;
    const [, st, en] = m; const a = en === 'ar';
    return {
      pres: [st + 'o', st + (a ? 'as' : 'es'), st + (a ? 'a' : 'e'), st + (a ? 'amos' : en === 'er' ? 'emos' : 'imos'), st + (a ? 'an' : 'en')],
      pret: a ? [st + 'é', st + 'aste', st + 'ó', st + 'amos', st + 'aron'] : [st + 'í', st + 'iste', st + 'ió', st + 'imos', st + 'ieron'],
      impf: a ? [st + 'aba', st + 'abas', st + 'aba', st + 'ábamos', st + 'aban'] : [st + 'ía', st + 'ías', st + 'ía', st + 'íamos', st + 'ían'],
      fut: [v + 'é', v + 'ás', v + 'á', v + 'emos', v + 'án'],
      cond: [v + 'ía', v + 'ías', v + 'ía', v + 'íamos', v + 'ían'],
      subj: a ? [st + 'e', st + 'es', st + 'e', st + 'emos', st + 'en'] : [st + 'a', st + 'as', st + 'a', st + 'amos', st + 'an'],
    };
  }

  /* ---------------- answer builders ---------------- */
  function tableFor(v, e, t, hp) {
    if (t === 'pp') return `<p><b>${esc(v)}</b>의 과거분사: <b class="cb-big">${esc(e.pp)}</b> ${spk(e.pp.split('/')[0])}</p><p class="cb-mute">예) He ${esc(e.pp.split('/')[0])}. (현재완료)</p>`;
    if (t === 'ger') return `<p><b>${esc(v)}</b>의 현재분사: <b class="cb-big">${esc(e.ger)}</b> ${spk(e.ger)}</p><p class="cb-mute">예) Estoy ${esc(e.ger)}. (현재진행)</p>`;
    const rows = e[t], lab = t === 'cmd' ? CMD_P : PERS;
    return `<table class="cb-tbl"><tr><th colspan="3">${esc(v)} · ${T_NAMES[t]}</th></tr>${rows.map((f, i) => f ? `<tr class="${i === hp ? 'hl' : ''}"><td>${lab[i]}</td><td><b>${esc(f)}</b></td><td>${spk((t === 'cmd' ? '' : SAY_P[i] + ' ') + f.split('/')[0])}</td></tr>` : `<tr><td>${lab[i]}</td><td class="cb-mute">—</td><td></td></tr>`).join('')}</table>`;
  }
  function summaryFor(v, e) {
    const pick = ['pres', 'pret', 'impf', 'fut'];
    return `<table class="cb-tbl"><tr><th>${esc(v)}</th>${pick.map(t => `<th>${T_NAMES[t]}</th>`).join('')}</tr>${PERS.map((p, i) => `<tr><td>${p}</td>${pick.map(t => `<td>${esc(e[t][i] || '—')}</td>`).join('')}</tr>`).join('')}</table>
      <p class="cb-mute">과거분사 <b>${esc(e.pp)}</b> · 현재분사 <b>${esc(e.ger)}</b> · tú 명령 <b>${esc(e.cmd[0])}</b></p>
      <div class="cb-chips">${['cond', 'subj', 'isubj', 'cmd'].map(t => `<button class="cb-chip" data-ask="${esc(v)} ${T_NAMES[t]}">${T_NAMES[t]}</button>`).join('')}</div>`;
  }

  function answerOffline(q) {
    const lq = q.toLowerCase();
    // quiz
    if (/퀴즈|문제\s*(내|줘|풀)|quiz|연습\s*문제\s*줘/.test(lq)) return startQuiz(q);
    if (/^(안녕|도움|뭐\s*할|무엇을|(hola|hi|hello|help)([\s!.?]|$))/.test(lq.trim())) return { html: helpText() };

    const t = detectTense(q), hp = detectPerson(q);
    const ws = words(q);
    // 1) infinitive lookup
    const inf = ws.find(w => VERBS[w]);
    const faq = bestFaq(q);
    if (faq && (!inf || !t)) return faqAns(faq.f);
    if (inf) {
      const e = VERBS[inf];
      if (t) return { html: tableFor(inf, e, t, hp) + secLink(T_SEC[t]), say: '' };
      return { html: `<p><b>${esc(inf)}</b>의 주요 시제예요. 다른 시제는 아래 버튼을 누르세요.</p>` + summaryFor(inf, e) };
    }
    // 2) reverse lookup of a conjugated form
    for (const w of ws) {
      const hits = REV[w] || REV['~' + strip(w)];
      if (hits && hits.length) {
        const exact = !!REV[w];
        const uniq = []; const seen = new Set();
        hits.forEach(h => { const k = h.v + h.t + h.p; if (!seen.has(k)) { seen.add(k); uniq.push(h); } });
        const lines = uniq.slice(0, 6).map(h => `<li><b>${esc(h.v)}</b> — ${T_NAMES[h.t]}${h.p >= 0 ? ' · ' + (h.t === 'cmd' ? CMD_P[h.p] : PERS[h.p]) : ''}</li>`).join('');
        const v0 = uniq[0].v;
        return { html: `<p><b>${esc(w)}</b> ${spk(w)} ${exact ? '' : '<span class="cb-warn">(악센트를 확인하세요)</span>'}은(는) 이런 형태예요:</p><ul>${lines}</ul><div class="cb-chips"><button class="cb-chip" data-ask="${esc(v0)} ${T_NAMES[uniq[0].t] || ''}">${esc(v0)} ${T_NAMES[uniq[0].t]} 전체 보기</button></div>` };
      }
    }
    // 3) unknown -ar/-er/-ir verb → regular guess
    const maybe = ws.find(w => /(ar|er|ir|ír)(se)?$/.test(w) && w.length > 3);
    if (maybe && t && !['cmd', 'pp', 'ger', 'isubj'].includes(t)) {
      const g = regularGuess(maybe.replace(/se$/, ''));
      if (g && g[t]) return { html: `<p class="cb-warn">'${esc(maybe)}'는 사전에 없어서 <b>규칙 동사</b>로 가정했어요. 불규칙 동사일 수 있으니 확인하세요.</p>` + tableFor(maybe, g, t, hp) };
    }
    // 4) FAQ / rules search
    if (faq && faq.score >= 1) return faqAns(faq.f);
    const r = searchRules(q);
    if (r.length) {
      return { html: `<p>관련 학습 내용을 찾았어요:</p>` + r.map(x => `<div class="cb-rule"><b>${x.id} ${esc(x.ko)}</b><div class="cb-mute">${esc(snippet(x.rule))}</div>${secLink(x.id)}</div>`).join('') };
    }
    return {
      html: `<p>음… 그 질문은 잘 모르겠어요 😅 이렇게 물어보세요:</p><div class="cb-chips">${['tener 점과거', 'hicieron은 무슨 뜻?', 'ser와 estar 차이', '접속법은 언제 써?', '퀴즈 내줘'].map(x => `<button class="cb-chip" data-ask="${x}">${x}</button>`).join('')}</div>` +
        (AI_URL ? '' : '<p class="cb-mute">자유로운 질문은 선생님이 AI 모드를 켜면 답할 수 있어요.</p>')
    };
  }
  function bestFaq(q) {
    const lq = q.toLowerCase(); let best = null;
    FAQ.forEach(f => {
      if (!f.need.every(n => new RegExp(n, 'i').test(lq))) return;
      const score = f.need.length + f.k.filter(k => lq.includes(k.toLowerCase())).length * 0.5;
      if (!best || score > best.score) best = { f, score };
    });
    return best;
  }
  function faqAns(f) { return { html: md(f.a) + (f.sec ? secLink(f.sec) : '') }; }
  function snippet(rule) { return rule.replace(/\*\*/g, '').split('\n').filter(l => !l.startsWith('|')).join(' ').replace(/^- /gm, '').slice(0, 140) + '…'; }
  function searchRules(q) {
    const terms = q.toLowerCase().replace(/[¿?¡!.,]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && !/^(은|는|이|가|을|를|뭐|어떻게|알려|줘|주세요|에요|요|동사|동사는|동사가|verb|verbs|the|what|how)$/.test(w));
    if (!terms.length) return [];
    return RULES.map(r => {
      const hay = (r.ko + ' ' + r.en + ' ' + r.cko).toLowerCase(), body = r.rule.toLowerCase();
      let s = 0; terms.forEach(t => { if (hay.includes(t)) s += 3; else if (body.includes(t)) s += 1; });
      return { ...r, s };
    }).filter(r => r.s >= 2).sort((a, b) => b.s - a.s).slice(0, 3);
  }
  function md(s) {
    return s.split('\n').map(l => {
      l = esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      if (/^- /.test(l)) return `<li>${l.slice(2)}</li>`;
      if (/^\d+\. /.test(l)) return `<li>${l.replace(/^\d+\. /, '')}</li>`;
      return l ? `<p>${l}</p>` : '';
    }).join('').replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`);
  }
  function helpText() {
    return `<p>¡Hola! 저는 <b>Verbos 360 도우미</b>예요 👋 이런 걸 물어볼 수 있어요:</p><ul>
      <li>동사 활용: <i>tener 점과거</i>, <i>dormir 접속법</i>, <i>ir 명령형</i></li>
      <li>이 형태는 뭐지?: <i>hicieron</i>, <i>durmió</i>, <i>vengas</i></li>
      <li>문법 질문: <i>ser estar 차이</i>, <i>점과거 불완료 차이</i>, <i>gustar 구조</i></li>
      <li>연습: <i>퀴즈 내줘</i>, <i>점과거 퀴즈</i></li></ul>` + (AI_URL ? '<p class="cb-mute">🤖 AI 선생님 모드가 켜져 있어 자유로운 질문에도 답해요.</p>' : '');
  }

  /* ---------------- quiz ---------------- */
  let quiz = null;
  function startQuiz(q) {
    const t = detectTense(q) || ['pres', 'pret', 'impf', 'fut', 'subj'][Math.floor(Math.random() * 5)];
    const pool = Object.keys(VERBS).filter(v => !v.endsWith('se') && VERBS[v][t === 'pp' || t === 'ger' ? 'pres' : t]);
    const v = pool[Math.floor(Math.random() * pool.length)];
    if (t === 'pp' || t === 'ger') { quiz = { v, t, p: -1, ans: VERBS[v][t] }; return { html: `🎯 <b>${esc(v)}</b>의 <b>${T_NAMES[t]}</b>는? <span class="cb-mute">(답을 입력하세요 · '그만'으로 종료)</span>` }; }
    const rows = VERBS[v][t];
    let p; do { p = Math.floor(Math.random() * 5); } while (!rows[p]);
    quiz = { v, t, p, ans: rows[p] };
    return { html: `🎯 <b>${esc(v)}</b> · <b>${T_NAMES[t]}</b> · <b>${t === 'cmd' ? CMD_P[p] : PERS[p]}</b> 형태는? <span class="cb-mute">(입력 · '그만'으로 종료)</span>` };
  }
  function checkQuiz(q) {
    if (/^(그만|stop|끝|종료)/.test(q.trim())) { quiz = null; return { html: '퀴즈를 마쳤어요. 수고했어요! 👏' }; }
    const st = window.SV ? SV.compare(q, quiz.ans.split('/')) : (q.trim() === quiz.ans ? 'ok' : 'bad');
    const msg = st === 'ok' ? `✅ ¡Correcto! <b>${esc(quiz.ans)}</b> ${spk(quiz.ans.split('/')[0])}` : st === 'acc' ? `🟡 거의 맞았어요! 악센트 확인: <b>${esc(quiz.ans)}</b>` : `❌ 정답은 <b>${esc(quiz.ans)}</b> ${spk(quiz.ans.split('/')[0])}`;
    const next = startQuiz(T_NAMES[quiz.t]);
    return { html: msg + '<hr class="cb-hr">' + next.html };
  }

  /* ---------------- AI mode ---------------- */
  const history = [];
  async function answerAI(q) {
    const ctx = window.CHAPTER ? (() => { const s = new URLSearchParams(location.search).get('s'); const sec = window.CHAPTER.sections.find(x => x.id === s) || window.CHAPTER.sections[0]; return `Chapter ${window.CHAPTER.ch} ${window.CHAPTER.ko} / 섹션 ${sec.id} ${sec.ko} (${sec.en})`; })() : '메인 페이지';
    history.push({ role: 'user', content: q.slice(0, 800) });
    const res = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-10), context: ctx }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const reply = (data.reply || '').trim();
    if (!reply) throw new Error('empty');
    history.push({ role: 'assistant', content: reply });
    return { html: md(reply), raw: reply };
  }

  /* ---------------- UI ---------------- */
  const css = document.createElement('style');
  css.textContent = `
  .cb-fab{position:fixed;right:20px;bottom:20px;z-index:75;width:60px;height:60px;border-radius:50%;border:0;background:var(--rojo,#b8202c);color:#fff;font-size:27px;box-shadow:0 10px 28px rgba(184,32,44,.4);cursor:pointer;transition:transform .15s}
  .cb-fab:hover{transform:scale(1.07)}
  .cb-fab .dot{position:absolute;right:4px;top:4px;width:14px;height:14px;border-radius:50%;background:var(--oro,#f2b705);border:2px solid #fff}
  .cb-panel{position:fixed;right:20px;bottom:92px;z-index:76;width:min(400px,calc(100vw - 24px));height:min(600px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;border:1px solid var(--line,#e7e1d5)}
  .cb-panel.open{display:flex}
  .cb-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--ink,#1d2433);color:#fff}
  .cb-head .av{width:36px;height:36px;border-radius:50%;background:var(--oro,#f2b705);display:grid;place-items:center;font-size:19px}
  .cb-head b{display:block;font-size:15px}.cb-head small{font-size:11.5px;opacity:.75}
  .cb-head button{margin-left:auto;background:transparent;border:0;color:#fff;font-size:22px;cursor:pointer}
  .cb-body{flex:1;overflow-y:auto;padding:14px;background:var(--bg,#fbf8f2);display:flex;flex-direction:column;gap:10px}
  .cb-msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:14.3px;line-height:1.55;word-break:break-word}
  .cb-msg p{margin:0 0 6px}.cb-msg p:last-child{margin:0}.cb-msg ul{margin:4px 0;padding-left:18px}
  .cb-bot{background:#fff;border:1px solid var(--line,#e7e1d5);align-self:flex-start;border-bottom-left-radius:4px}
  .cb-me{background:var(--blue,#2457a6);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .cb-tbl{border-collapse:collapse;margin:4px 0;font-size:13.5px;width:100%}
  .cb-tbl th{background:var(--ink,#1d2433);color:#fff;padding:5px 7px;text-align:left;font-size:12.5px}
  .cb-tbl td{padding:4px 7px;border-bottom:1px solid #f1ece2}
  .cb-tbl tr.hl td{background:var(--oro-l,#fff4cf)}
  .cb-big{font-size:18px;color:var(--rojo,#b8202c)}
  .cb-mute{color:var(--ink-3,#7c8597);font-size:12.5px}
  .cb-warn{color:var(--warn,#b26b00);font-size:12.5px}
  .cb-link{display:inline-block;margin-top:6px;font-size:12.5px;font-weight:700;color:var(--blue,#2457a6);text-decoration:none}
  .cb-rule{border-top:1px dashed #e7e1d5;padding-top:6px;margin-top:6px}
  .cb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .cb-chip{border:1px solid #cfdcf3;background:var(--blue-bg,#e9f0fb);color:var(--blue,#2457a6);border-radius:999px;padding:4px 10px;font-size:12.5px;cursor:pointer}
  .cb-hr{border:0;border-top:1px dashed #e7e1d5;margin:8px 0}
  .cb-typing{color:var(--ink-3,#7c8597);font-size:13px}
  .cb-foot{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#e7e1d5);background:#fff}
  .cb-foot input{flex:1;min-width:0;border:1px solid var(--line,#e7e1d5);border-radius:12px;padding:10px 12px;font-size:15px;outline:none}
  .cb-foot input:focus{border-color:var(--blue,#2457a6)}
  .cb-foot button{white-space:nowrap;border:0;background:var(--rojo,#b8202c);color:#fff;border-radius:12px;padding:0 16px;font-size:15px;font-weight:700;cursor:pointer}
  .cb-mode{display:flex;gap:6px;padding:6px 14px;background:#fff;border-bottom:1px solid var(--line,#e7e1d5);font-size:12px;align-items:center}
  .cb-mode button{border:1px solid var(--line,#e7e1d5);background:#fff;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
  .cb-mode button.on{background:var(--ink,#1d2433);color:#fff;border-color:var(--ink,#1d2433)}
  @media (max-width:560px){.cb-panel{right:8px;bottom:84px;height:calc(100vh - 100px)}.cb-fab{right:12px;bottom:12px}}
  body.cb-open .acc-kb{bottom:auto;top:70px;z-index:80}`;
  document.head.appendChild(css);

  const fab = document.createElement('button');
  fab.className = 'cb-fab'; fab.title = '질문하기 (학습 도우미)'; fab.setAttribute('aria-label', '학습 도우미 챗봇 열기');
  fab.innerHTML = '💬<span class="dot"></span>';
  const panel = document.createElement('div');
  panel.className = 'cb-panel';
  panel.innerHTML = `<div class="cb-head"><div class="av">🦉</div><div><b>Profe Búho · 학습 도우미</b><small>${AI_URL ? 'AI 선생님 + 동사 사전' : '동사 사전 · 문법 안내 · 퀴즈'}</small></div><button aria-label="닫기">×</button></div>
    ${AI_URL ? '<div class="cb-mode">답변 방식: <button data-m="ai" class="on">🤖 AI 선생님</button><button data-m="dict">📖 빠른 사전</button></div>' : ''}
    <div class="cb-body"></div>
    <form class="cb-foot"><input placeholder="예: tener 점과거 / ser estar 차이" autocomplete="off" maxlength="400"><button>보내기</button></form>`;
  document.body.appendChild(fab); document.body.appendChild(panel);
  const body = panel.querySelector('.cb-body'), input = panel.querySelector('input');
  let mode = AI_URL ? 'ai' : 'dict', started = false;

  function add(html, who) {
    const d = document.createElement('div'); d.className = 'cb-msg ' + (who === 'me' ? 'cb-me' : 'cb-bot'); d.innerHTML = html;
    body.appendChild(d); body.scrollTop = body.scrollHeight; return d;
  }
  async function ask(q) {
    q = q.trim(); if (!q) return;
    add(esc(q), 'me'); input.value = '';
    const wait = add('<span class="cb-typing">생각 중…</span>');
    try {
      await ensureData();
      let r;
      const wantsDict = quiz || /퀴즈|quiz/.test(q) || (words(q).some(w => VERBS[w]) && detectTense(q)) || (words(q).length === 1 && REV[words(q)[0]] && q.trim().split(/\s+/).length === 1);
      if (quiz) r = checkQuiz(q);
      else if (mode === 'ai' && AI_URL && !wantsDict) {
        try { r = await answerAI(q); } catch (e) { r = answerOffline(q); r.html = '<p class="cb-mute">(AI 연결이 원활하지 않아 사전으로 답해요)</p>' + r.html; }
      } else r = answerOffline(q);
      wait.innerHTML = r.html;
    } catch (e) { wait.innerHTML = '데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; }
    body.scrollTop = body.scrollHeight;
  }
  function open() {
    document.body.classList.add('cb-open');
    panel.classList.add('open'); fab.querySelector('.dot').style.display = 'none';
    if (!started) { started = true; add(helpText() + `<div class="cb-chips">${['tener 점과거', 'hicieron', 'ser estar 차이', '퀴즈 내줘'].map(x => `<button class="cb-chip" data-ask="${x}">${x}</button>`).join('')}</div>`); ensureData(); }
    setTimeout(() => input.focus(), 50);
  }
  fab.addEventListener('click', () => panel.classList.contains('open') ? (panel.classList.remove('open'), document.body.classList.remove('cb-open')) : open());
  panel.querySelector('.cb-head button').addEventListener('click', () => { panel.classList.remove('open'); document.body.classList.remove('cb-open'); });
  panel.querySelector('form').addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  body.addEventListener('click', e => { const c = e.target.closest('[data-ask]'); if (c) ask(c.dataset.ask); });
  panel.querySelectorAll('.cb-mode button').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; panel.querySelectorAll('.cb-mode button').forEach(x => x.classList.toggle('on', x === b)); }));
  window.SVChat = { open, ask };
})();
