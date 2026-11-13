(function () {
  const C = window.CHAPTER;
  const B = window.BOOK;
  const params = new URLSearchParams(location.search);
  let cur = C.sections.find(s => s.id === params.get('s')) || C.sections[0];
  const nav = document.getElementById('sidenav');
  const main = document.getElementById('main');
  const LETTER = 'ABCDEFGHIJ';
  const TENSE_KO = { pres: '현재 (Presente)', pret: '점과거 (Pretérito)', impf: '불완료과거 (Imperfecto)', fut: '미래 (Futuro)', cond: '가정미래 (Condicional)', subj: '접속법 현재 (Presente de subjuntivo)', isubj: '접속법 과거 (Imperfecto de subjuntivo)', perf: '현재완료 (Pretérito perfecto)', prog: '현재진행 (estar + gerundio)', pprog: '과거진행 (estaba + gerundio)', cmd3: '명령형 (Imperativo)', cmd4: '명령형 (Imperativo)', cmd5: '명령형 (Imperativo)', pp: '과거분사 (Participio)', ger: '현재분사 (Gerundio)', ppadj: '형용사형 과거분사' };
  const PERSON_SAY = ['yo', 'tú', 'él', 'nosotros', 'ellos'];
  const KIND_INFO = {
    fill: '빈칸 채우기', mc: '알맞은 것 고르기', fix: '틀린 곳 고치기', odd: '다른 하나 찾기', match: '짝 맞추기', build: '문장 만들기',
    trans: '번역 문장 만들기', qa: '질문에 답하기', tf: '참·거짓', cross: '크로스워드', fake: '가짜 동사 찾기'
  };
  document.title = `Verbos 360 · ${C.ch}. ${C.ko}`;

  /* ---------------- nav ---------------- */
  function renderNav() {
    const P = SV.load();
    nav.innerHTML = `
      <select class="chap-select" id="chsel">${B.chapters.map(c => `<option value="${c.ch}" ${c.ch === C.ch ? 'selected' : ''}>Ch ${c.ch}. ${SV.esc(c.ko)}</option>`).join('')}</select>
      <div class="ch-label">Chapter ${C.ch}</div>
      <h2>${SV.esc(C.ko)}</h2>
      ${C.sections.map(s => {
        return `<a class="s ${s.id === cur.id ? 'on' : ''}" href="?ch=${C.ch}&s=${s.id}" data-s="${s.id}"><span class="sec-id">${s.id}</span><span>${SV.esc(s.ko)}</span><span class="pct">${pctText(s, P)}</span></a>`;
      }).join('')}
      <div class="chap-nav">
        ${C.ch > 1 ? `<a href="?ch=${C.ch - 1}">← Ch ${C.ch - 1}</a>` : ''}
        <a href="index.html">목차</a>
        ${C.ch < 24 ? `<a href="?ch=${C.ch + 1}">Ch ${C.ch + 1} →</a>` : ''}
      </div>`;
    nav.querySelector('#chsel').addEventListener('change', e => { location.href = `?ch=${e.target.value}`; });
    nav.querySelectorAll('a.s').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      cur = C.sections.find(s => s.id === a.dataset.s);
      history.replaceState(null, '', `?ch=${C.ch}&s=${cur.id}`);
      renderSection();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  }

  function pctText(s, P) {
    const sc = SV.secScore(s.id, P);
    return sc.t ? Math.min(100, Math.round(sc.c / s.total * 100)) + '%' : '';
  }

  /* ---------------- markdown-lite ---------------- */
  function md(src) {
    if (!src) return '';
    const lines = src.split('\n');
    let html = '', tbl = [], ul = [];
    const inline = s => SV.esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const flush = () => {
      if (tbl.length) {
        const rows = tbl.map(r => r.replace(/^\||\|$/g, '').split('|').map(x => x.trim()));
        html += '<div class="tblwrap"><table><thead><tr>' + rows[0].map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rows.slice(1).map(r => '<tr>' + r.map((c, i) => {
            const plain = c.replace(/\*\*/g, '');
            const say = i > 0 && !/[가-힣]/.test(plain) && /[a-záéíóúñ]/i.test(plain);
            return `<td${say ? ` class="say" data-say="${SV.esc(plain)}" title="클릭하면 들려요"` : ''}>${inline(c)}</td>`;
          }).join('') + '</tr>').join('') + '</tbody></table></div>';
        tbl = [];
      }
      if (ul.length) { html += '<ul>' + ul.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>'; ul = []; }
    };
    lines.forEach(l => {
      l = l.trim();
      if (l.startsWith('|')) { if (ul.length) flush(); tbl.push(l); return; }
      if (l.startsWith('- ')) { if (tbl.length) flush(); ul.push(l.slice(2)); return; }
      flush();
      if (l) html += `<p>${inline(l)}</p>`;
    });
    flush();
    return html;
  }

  /* ---------------- helpers ---------------- */
  function resultBadge(el, c, t) {
    const pct = t ? c / t : 0;
    el.className = 'result show ' + (pct >= .9 ? 'great' : pct >= .6 ? 'mid' : 'low');
    el.textContent = `${c} / ${t}  (${Math.round(pct * 100)}점)`;
  }
  function stripParen(q) { return q.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+([.,?!])/g, '$1').trim(); }
  function fillSentence(q, ans) {
    let i = 0;
    const arr = Array.isArray(ans) ? ans : [ans];
    return stripParen(q.replace(/___+/g, () => arr[Math.min(i++, arr.length - 1)]));
  }
  function setCell(inp, state, answer) {
    inp.classList.remove('ok', 'bad', 'acc');
    if (state) inp.classList.add(state);
    let tip = inp.parentElement.querySelector('.fix-tip');
    if (tip) tip.remove();
    if (state === 'bad' || state === 'acc') {
      tip = document.createElement('span');
      tip.className = 'fix-tip' + (state === 'acc' ? ' acc' : '');
      tip.textContent = (state === 'acc' ? '악센트 확인 → ' : '→ ') + answer;
      inp.insertAdjacentElement('afterend', tip);
    }
  }

  /* ---------------- grid ---------------- */
  function renderGrid(sec, card) {
    const body = card.querySelector('.card-b');
    let page = 0;
    const draw = () => {
      const rows = sec.grids[page];
      const tabs = sec.grids.length > 1 ? `<div class="grid-tabs">${sec.grids.map((g, i) => `<button class="${i === page ? 'on' : ''}" data-p="${i}">표 ${i + 1} <small>(${g.length})</small></button>`).join('')}</div>` : '';
      body.innerHTML = tabs + `<div class="vgrid-wrap"><table class="vgrid"><thead><tr><th>Verbo</th>${sec.cols.map(c => `<th>${SV.esc(c)}</th>`).join('')}<th></th></tr></thead><tbody>` +
        rows.map((r, ri) => {
          const ex = page === 0 && ri === 0;
          return `<tr class="${ex ? 'example' : ''}" data-r="${ri}"><td class="vb">${SV.esc(r.v.replace(/\+/g, ' + '))} ${SV.spkBtn(r.v.replace(/\+/g, ' '))}${ex ? '<div class="sec-meta">예시</div>' : ''}</td>` +
            r.f.map((f, ci) => f === null ? `<td><input class="cell na" value="—" disabled></td>` :
              `<td><input class="cell" data-c="${ci}" ${ex ? `value="${SV.esc(f)}" readonly` : ''} autocomplete="off" autocapitalize="off" spellcheck="false"></td>`).join('') +
            `<td>${SV.spkBtn(rowSay(sec, r), '활용 전체 듣기')}</td></tr>`;
        }).join('') + `</tbody></table></div>
        <div class="legend"><span class="l-ok">정답</span><span class="l-acc">악센트(´)만 틀림</span><span class="l-bad">오답</span><span>· Enter 키로 다음 칸 이동</span></div>`;
      body.querySelectorAll('.grid-tabs button').forEach(b => b.addEventListener('click', () => { page = +b.dataset.p; draw(); card.querySelector('.result').className = 'result'; }));
      const inputs = [...body.querySelectorAll('input.cell:not([readonly]):not([disabled])')];
      inputs.forEach((inp, i) => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); (inputs[i + 1] || inp).focus(); } }));
    };
    draw();
    const res = card.querySelector('.result');
    card.querySelector('[data-act=check]').addEventListener('click', () => {
      const rows = sec.grids[page];
      let c = 0, t = 0;
      body.querySelectorAll('tbody tr').forEach(tr => {
        const r = rows[+tr.dataset.r];
        if (tr.classList.contains('example')) return;
        tr.querySelectorAll('input.cell[data-c]').forEach(inp => {
          const ans = r.f[+inp.dataset.c];
          const st = SV.compare(inp.value, ans.split('/'));
          t++; if (st === 'ok') c++;
          setCell(inp, st, ans);
        });
      });
      resultBadge(res, c, t);
      SV.record(sec.id, 'g' + page, c, t);
      refreshScores();
    });
    card.querySelector('[data-act=show]').addEventListener('click', () => {
      const rows = sec.grids[page];
      body.querySelectorAll('tbody tr').forEach(tr => {
        const r = rows[+tr.dataset.r];
        tr.querySelectorAll('input.cell[data-c]').forEach(inp => { if (!inp.value.trim() || !inp.classList.contains('ok')) { inp.value = r.f[+inp.dataset.c]; setCell(inp, null); inp.classList.add('acc'); } });
      });
      SV.toast('정답을 표시했어요 (노란색). 다시 풀려면 [지우기]');
    });
    card.querySelector('[data-act=reset]').addEventListener('click', () => { draw(); res.className = 'result'; });
  }
  function rowSay(sec, r) {
    if (['pres', 'pret', 'impf', 'fut', 'cond', 'subj', 'isubj', 'perf', 'prog', 'pprog'].includes(sec.grid)) {
      return r.f.map((f, i) => f ? `${PERSON_SAY[i]} ${f}` : '').filter(Boolean).join('. ');
    }
    return r.v + '. ' + r.f.filter(Boolean).join('. ');
  }

  /* ---------------- exercises ---------------- */
  const R = {};
  const bindOpts = root => root.querySelectorAll('.opts').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('.opt'); if (!b || g.dataset.done) return; g.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x === b)); }));
  R.fill = (ex) => ({
    html: `<ol class="items">${ex.items.map((it, i) => `<li data-i="${i}"><div class="q">${SV.esc(it.q).replace(/___+/g, '<input class="inp" autocomplete="off" autocapitalize="off" spellcheck="false">')}</div><div class="feedback"></div></li>`).join('')}</ol>`,
    check(root) {
      let c = 0;
      root.querySelectorAll('li').forEach(li => {
        const it = ex.items[+li.dataset.i];
        const inps = [...li.querySelectorAll('input')];
        let allOk = true, st = 'ok';
        if (inps.length === 1) {
          st = SV.compare(inps[0].value, it.a);
          inps[0].className = 'inp ' + st; allOk = st === 'ok';
        } else {
          const parts = it.a[0].split(' ... ');
          inps.forEach((inp, k) => { const s2 = SV.compare(inp.value, [parts[k] || '']); inp.className = 'inp ' + s2; if (s2 !== 'ok') { allOk = false; st = s2; } });
        }
        if (allOk) c++;
        li.className = allOk ? 'ok' : 'bad';
        const full = fillSentence(it.q, it.a[0].split(' ... '));
        li.querySelector('.feedback').className = 'feedback show';
        li.querySelector('.feedback').innerHTML = (allOk ? '' : (st === 'acc' ? '<span class="warn">악센트를 확인하세요</span>' : '') + `정답: <span class="ans">${SV.esc(it.a.join(' / '))}</span>`) + SV.spkBtn(full, '문장 듣기') + `<span class="sec-meta">${SV.esc(full)}</span>`;
      });
      return c;
    }
  });
  R.mc = (ex) => ({
    html: `<ol class="items">${ex.items.map((it, i) => `<li data-i="${i}"><div class="q">${SV.esc(it.q).replace(/___+/g, '<b class="blank">______</b>')}</div><div class="opts">${it.o.map((o, k) => `<button class="opt" data-k="${k}">${SV.esc(o)}</button>`).join('')}</div><div class="feedback"></div></li>`).join('')}</ol>`,
    bind: bindOpts,
    check(root) {
      let c = 0;
      root.querySelectorAll('li').forEach(li => {
        const it = ex.items[+li.dataset.i];
        const sel = li.querySelector('.opt.sel');
        const ok = sel && +sel.dataset.k === it.a;
        if (ok) c++;
        li.querySelectorAll('.opt').forEach(b => { b.classList.remove('right', 'wrong'); if (+b.dataset.k === it.a) b.classList.add('right'); else if (b === sel) b.classList.add('wrong'); });
        li.className = ok ? 'ok' : 'bad';
        const full = it.q.includes('___') ? stripParen(it.q.replace(/___+/g, it.o[it.a])) : it.o[it.a];
        li.querySelector('.feedback').className = 'feedback show';
        li.querySelector('.feedback').innerHTML = SV.spkBtn(full, '문장 듣기') + `<span class="sec-meta">${SV.esc(full)}</span>`;
      });
      return c;
    }
  });
  R.odd = R.fake = (ex) => ({
    html: `<ol class="items">${ex.items.map((it, i) => `<li data-i="${i}"><div class="opts">${it.o.map((o, k) => `<button class="opt" data-k="${k}">${SV.esc(o)}</button>`).join('')}</div><div class="feedback"></div></li>`).join('')}</ol>`,
    bind: bindOpts,
    check(root) {
      let c = 0;
      root.querySelectorAll('li').forEach(li => {
        const it = ex.items[+li.dataset.i];
        const sel = li.querySelector('.opt.sel');
        const ok = sel && +sel.dataset.k === it.a;
        if (ok) c++;
        li.querySelectorAll('.opt').forEach(b => { b.classList.remove('right', 'wrong'); if (+b.dataset.k === it.a) b.classList.add('right'); else if (b === sel) b.classList.add('wrong'); });
        li.className = ok ? 'ok' : 'bad';
        if (it.x) { li.querySelector('.feedback').className = 'feedback show'; li.querySelector('.feedback').innerHTML = `💡 ${SV.esc(it.x)}`; }
      });
      return c;
    }
  });
  R.tf = (ex) => ({
    html: `<ol class="items">${ex.items.map((it, i) => `<li data-i="${i}"><div class="q">${SV.esc(it.q)} ${SV.spkBtn(it.q)}</div><div class="opts"><button class="opt" data-k="1">Cierto (참)</button><button class="opt" data-k="0">Falso (거짓)</button></div><div class="feedback"></div></li>`).join('')}</ol>`,
    bind: bindOpts,
    check(root) {
      let c = 0;
      root.querySelectorAll('li').forEach(li => {
        const it = ex.items[+li.dataset.i];
        const sel = li.querySelector('.opt.sel');
        const want = it.a ? 1 : 0;
        const ok = sel && +sel.dataset.k === want;
        if (ok) c++;
        li.querySelectorAll('.opt').forEach(b => { b.classList.remove('right', 'wrong'); if (+b.dataset.k === want) b.classList.add('right'); else if (b === sel) b.classList.add('wrong'); });
        li.className = ok ? 'ok' : 'bad';
        if (it.x) { li.querySelector('.feedback').className = 'feedback show'; li.querySelector('.feedback').innerHTML = `💡 ${SV.esc(it.x)}`; }
      });
      return c;
    }
  });
  R.fix = (ex) => ({
    html: `<ol class="items">${ex.items.map((it, i) => `<li data-i="${i}"><div class="q" style="color:var(--ink-3)"><s>${SV.esc(it.q)}</s></div><input class="inp wide" value="${SV.esc(it.q)}" autocomplete="off" spellcheck="false"><div class="feedback"></div></li>`).join('')}</ol>`,
    check(root) {
      let c = 0;
      root.querySelectorAll('li').forEach(li => {
        const it = ex.items[+li.dataset.i];
        const inp = li.querySelector('input');
        const st = SV.compare(inp.value, it.a);
        inp.className = 'inp wide ' + st;
        if (st === 'ok') c++;
        li.className = st === 'ok' ? 'ok' : 'bad';
        li.querySelector('.feedback').className = 'feedback show';
        li.querySelector('.feedback').innerHTML = (st === 'ok' ? '' : (st === 'acc' ? '<span class="warn">악센트를 확인하세요</span> ' : '') + `정답: <span class="ans">${SV.esc(it.a[0])}</span>`) + SV.spkBtn(it.a[0], '문장 듣기');
      });
      return c;
    }
  });
  R.qa = (ex) => ({
    html: `<ol class="items">${ex.items.map((it, i) => `<li data-i="${i}"><div class="qa-q">${SV.esc(it.q)} ${SV.spkBtn(it.q, '질문 듣기')}</div><div class="qa-a q">↳ ${SV.esc(it.a).replace(/\[[^\]]+\]/g, '<input class="inp" autocomplete="off" autocapitalize="off" spellcheck="false">')}</div><div class="feedback"></div></li>`).join('')}</ol>`,
    check(root) {
      let c = 0;
      root.querySelectorAll('li').forEach(li => {
        const it = ex.items[+li.dataset.i];
        const ans = [...it.a.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
        let ok = true, acc = false;
        li.querySelectorAll('input').forEach((inp, k) => { const st = SV.compare(inp.value, ans[k].split('/')); inp.className = 'inp ' + st; if (st !== 'ok') ok = false; if (st === 'acc') acc = true; });
        if (ok) c++;
        li.className = ok ? 'ok' : 'bad';
        const full = it.a.replace(/\[([^\]]+)\]/g, (m, x) => x.split('/')[0]);
        li.querySelector('.feedback').className = 'feedback show';
        li.querySelector('.feedback').innerHTML = (ok ? '' : (acc ? '<span class="warn">악센트를 확인하세요</span> ' : '') + `정답: <span class="ans">${SV.esc(ans.join(' … '))}</span>`) + SV.spkBtn(full, '답 듣기') + `<span class="sec-meta">${SV.esc(full)}</span>`;
      });
      return c;
    }
  });
  R.match = (ex) => {
    const rights = SV.shuffle(ex.items.map(it => it.r));
    return {
      html: `<ol class="items">${ex.items.map((it, i) => `<li data-i="${i}"><div class="match-row"><span class="l">${SV.esc(it.l)} ${SV.spkBtn(it.l.replace(/\.\.\.|…/g, ''))}</span><select><option value="">— 고르세요 —</option>${rights.map(r => `<option>${SV.esc(r)}</option>`).join('')}</select></div><div class="feedback"></div></li>`).join('')}</ol>`,
      check(root) {
        let c = 0;
        root.querySelectorAll('li').forEach(li => {
          const it = ex.items[+li.dataset.i];
          const s = li.querySelector('select');
          const ok = s.value === it.r;
          s.className = ok ? 'ok' : 'bad';
          if (ok) c++;
          li.className = ok ? 'ok' : 'bad';
          li.querySelector('.feedback').className = ok ? 'feedback' : 'feedback show';
          li.querySelector('.feedback').innerHTML = `정답: <span class="ans">${SV.esc(it.r)}</span>`;
        });
        return c;
      }
    };
  };
  function tokens(s) { return s.replace(/[¿¡?!.,;:]/g, ' ').split(/\s+/).filter(Boolean); }
  R.build = R.trans = (ex) => ({
    html: `<ol class="items">${ex.items.map((it, i) => {
      const tk0 = tokens(it.s);
      if (tk0.length <= 2) {
        return `<li data-i="${i}" data-mode="type"><div class="prompt-en">“${SV.esc(it.p)}”</div><input class="inp wide" placeholder="스페인어로 직접 쓰세요" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="feedback"></div></li>`;
      }
      const tk = SV.shuffle(tk0.map((w, k) => ({ w, k })));
      return `<li data-i="${i}"><div class="prompt-en">“${SV.esc(it.p)}”</div><div class="answer-line"></div><div class="tiles">${tk.map(t => `<button class="tile" data-w="${SV.esc(t.w)}">${SV.esc(t.w)}</button>`).join('')}</div><div style="margin-top:6px"><button class="btn sm" data-undo>↶ 하나 빼기</button> <button class="btn sm" data-clear>모두 지우기</button></div><div class="feedback"></div></li>`;
    }).join('')}</ol>`,
    bind(root) {
      root.querySelectorAll('li:not([data-mode=type])').forEach(li => {
        const line = li.querySelector('.answer-line');
        li.querySelector('.tiles').addEventListener('click', e => {
          const t = e.target.closest('.tile'); if (!t || t.classList.contains('used')) return;
          t.classList.add('used');
          const n = document.createElement('button'); n.className = 'tile'; n.textContent = t.dataset.w; n._src = t;
          n.addEventListener('click', () => { n._src.classList.remove('used'); n.remove(); });
          line.appendChild(n);
        });
        li.querySelector('[data-undo]').addEventListener('click', () => { const l = line.lastElementChild; if (l) { l._src.classList.remove('used'); l.remove(); } });
        li.querySelector('[data-clear]').addEventListener('click', () => { [...line.children].forEach(l => { l._src.classList.remove('used'); l.remove(); }); });
      });
    },
    check(root) {
      let c = 0;
      root.querySelectorAll('ol.items > li').forEach(li => {
        const it = ex.items[+li.dataset.i];
        let ok, st = 'bad';
        if (li.dataset.mode === 'type') {
          const inp = li.querySelector('input');
          st = SV.compare(inp.value, [it.s]);
          inp.className = 'inp wide ' + st;
          ok = st === 'ok';
        } else {
          const got = [...li.querySelectorAll('.answer-line .tile')].map(t => t.textContent).join(' ');
          ok = SV.norm(got) === SV.norm(tokens(it.s).join(' '));
        }
        if (ok) c++;
        li.className = ok ? 'ok' : 'bad';
        li.querySelector('.feedback').className = 'feedback show';
        li.querySelector('.feedback').innerHTML = (ok ? '' : (st === 'acc' ? '<span class="warn">악센트를 확인하세요</span> ' : '') + `정답: <span class="ans">${SV.esc(it.s)}</span>`) + SV.spkBtn(it.s, '문장 듣기') + (ok ? `<span class="sec-meta">${SV.esc(it.s)}</span>` : '');
      });
      return c;
    }
  });
  /* crossword */
  function cwKey(a) { return SV.stripAcc(a.toLowerCase()).replace(/[^a-zñ]/g, ''); }
  function layoutCrossword(words) {
    let best = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const order = attempt === 0 ? words.slice().sort((a, b) => b.key.length - a.key.length) : SV.shuffle(words);
      const grid = new Map(); const placed = [];
      const get = (x, y) => grid.get(x + ',' + y);
      const canPlace = (w, x, y, dir) => {
        const dx = dir === 'A' ? 1 : 0, dy = dir === 'A' ? 0 : 1; let inter = 0;
        if (get(x - dx, y - dy) || get(x + dx * w.length, y + dy * w.length)) return -1;
        for (let i = 0; i < w.length; i++) {
          const cx = x + dx * i, cy = y + dy * i, ch = get(cx, cy);
          if (ch) { if (ch !== w[i]) return -1; inter++; }
          else if (get(cx + dy, cy + dx) || get(cx - dy, cy - dx)) return -1;
        }
        return inter;
      };
      const put = (wd, x, y, dir) => { const dx = dir === 'A' ? 1 : 0, dy = dir === 'A' ? 0 : 1; for (let i = 0; i < wd.key.length; i++) grid.set((x + dx * i) + ',' + (y + dy * i), wd.key[i]); placed.push({ ...wd, x, y, dir }); };
      put(order[0], 0, 0, 'A');
      const left = [];
      for (const wd of order.slice(1)) {
        let cand = null;
        for (const p of placed) for (let i = 0; i < p.key.length; i++) for (let j = 0; j < wd.key.length; j++) {
          if (p.key[i] !== wd.key[j]) continue;
          const dir = p.dir === 'A' ? 'D' : 'A';
          const px = p.x + (p.dir === 'A' ? i : 0), py = p.y + (p.dir === 'A' ? 0 : i);
          const x = px - (dir === 'A' ? j : 0), y = py - (dir === 'A' ? 0 : j);
          const sc = canPlace(wd.key, x, y, dir);
          if (sc > 0 && (!cand || sc > cand.sc || (sc === cand.sc && Math.random() < .3))) cand = { x, y, dir, sc };
        }
        if (cand) put(wd, cand.x, cand.y, cand.dir); else left.push(wd);
      }
      const xs = [...grid.keys()].map(k => +k.split(',')[0]), ys = [...grid.keys()].map(k => +k.split(',')[1]);
      const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
      const score = placed.length * 1000 - area;
      if (!best || score > best.score) best = { placed, left, score };
      if (!left.length && attempt > 20) break;
    }
    // place leftovers on new rows beneath
    let ys = best.placed.map(p => p.y + (p.dir === 'D' ? p.key.length - 1 : 0));
    let minx = Math.min(...best.placed.map(p => p.x));
    let y = Math.max(...ys) + 2;
    best.left.forEach(wd => { best.placed.push({ ...wd, x: minx, y, dir: 'A' }); y += 2; });
    return best.placed;
  }
  R.cross = (ex) => {
    const words = ex.items.map((it, i) => ({ i, key: cwKey(it.a), clue: it.c, ans: it.a }));
    const placed = layoutCrossword(words);
    const minX = Math.min(...placed.map(p => p.x)), minY = Math.min(...placed.map(p => p.y));
    placed.forEach(p => { p.x -= minX; p.y -= minY; });
    const W = Math.max(...placed.map(p => p.x + (p.dir === 'A' ? p.key.length : 1)));
    const H = Math.max(...placed.map(p => p.y + (p.dir === 'D' ? p.key.length : 1)));
    const cells = {};
    placed.forEach(p => { for (let k = 0; k < p.key.length; k++) { const x = p.x + (p.dir === 'A' ? k : 0), y = p.y + (p.dir === 'D' ? k : 0); cells[x + ',' + y] = p.key[k]; } });
    const starts = [...new Set(placed.map(p => p.x + ',' + p.y))].sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return ay - by || ax - bx; });
    const num = {}; starts.forEach((s, i) => num[s] = i + 1);
    placed.forEach(p => p.n = num[p.x + ',' + p.y]);
    let g = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = x + ',' + y;
      g += cells[k] ? `<div class="cw-cell l" data-k="${k}">${num[k] ? `<span class="n">${num[k]}</span>` : ''}<input maxlength="1" autocomplete="off" autocapitalize="off" spellcheck="false"></div>` : '<div class="cw-cell"></div>';
    }
    const list = d => placed.filter(p => p.dir === d).sort((a, b) => a.n - b.n).map(p => `<li><b>${p.n}.</b> ${SV.esc(p.clue)} <span class="sec-meta">(${p.key.length})</span></li>`).join('');
    return {
      html: `<div class="cw-wrap"><div class="cw-grid" style="grid-template-columns:repeat(${W},30px)">${g}</div>
        <div class="cw-clues"><h4>→ Horizontales (가로)</h4><ol>${list('A')}</ol><h4>↓ Verticales (세로)</h4><ol>${list('D')}</ol>
        <div class="empty-note">※ 칸에는 악센트 없이 써도 됩니다. 띄어쓰기는 생략하세요.</div></div></div>`,
      bind(root) {
        let dir = 'A';
        root.querySelectorAll('.cw-cell.l input').forEach(inp => {
          inp.addEventListener('input', () => {
            const [x, y] = inp.parentElement.dataset.k.split(',').map(Number);
            const nx = dir === 'A' ? x + 1 : x, ny = dir === 'A' ? y : y + 1;
            let nxt = root.querySelector(`.cw-cell[data-k="${nx},${ny}"] input`);
            if (!nxt) { dir = dir === 'A' ? 'D' : 'A'; nxt = root.querySelector(`.cw-cell[data-k="${dir === 'A' ? x + 1 : x},${dir === 'A' ? y : y + 1}"] input`); }
            if (inp.value && nxt) nxt.focus();
          });
          inp.addEventListener('focus', () => inp.select());
          inp.addEventListener('dblclick', () => { dir = dir === 'A' ? 'D' : 'A'; SV.toast(dir === 'A' ? '가로 방향 입력' : '세로 방향 입력'); });
        });
      },
      check(root) {
        let c = 0;
        root.querySelectorAll('.cw-cell.l').forEach(cell => {
          const v = cwKey(cell.querySelector('input').value || '');
          cell.classList.remove('ok', 'bad');
          cell.classList.add(v === cells[cell.dataset.k] ? 'ok' : 'bad');
        });
        placed.forEach(p => {
          let ok = true;
          for (let k = 0; k < p.key.length; k++) { const x = p.x + (p.dir === 'A' ? k : 0), y = p.y + (p.dir === 'D' ? k : 0); const v = cwKey(root.querySelector(`.cw-cell[data-k="${x},${y}"] input`).value || ''); if (v !== p.key[k]) ok = false; }
          if (ok) c++;
        });
        return c;
      },
      reveal(root) { root.querySelectorAll('.cw-cell.l').forEach(cell => { cell.querySelector('input').value = cells[cell.dataset.k]; }); }
    };
  };

  function renderExercise(sec, ex, idx, container) {
    const card = document.createElement('section');
    card.className = 'card';
    const r = (R[ex.k] || R.fill)(ex);
    card.innerHTML = `<div class="card-h"><div class="badge">${LETTER[idx]}</div><div><h2>${SV.esc(ex.ko || KIND_INFO[ex.k])}</h2><div class="sub">${SV.esc(ex.es)} · <span class="tag">${KIND_INFO[ex.k] || ex.k}</span></div></div></div>
      <div class="card-b">${r.html}</div>
      <div class="card-f"><button class="btn go" data-act="check">✓ 채점하기</button><button class="btn" data-act="reset">↺ 다시 풀기</button>${r.reveal ? '<button class="btn" data-act="reveal">정답 보기</button>' : ''}<span class="result"></span></div>`;
    container.appendChild(card);
    const body = card.querySelector('.card-b');
    if (r.bind) r.bind(body);
    body.querySelectorAll('input.inp').forEach((inp) => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const all = [...body.querySelectorAll('input.inp')]; const n = all[all.indexOf(inp) + 1]; if (n) n.focus(); else card.querySelector('[data-act=check]').click(); }
    }));
    card.querySelector('[data-act=check]').addEventListener('click', () => {
      const c = r.check(body);
      const t = ex.items.length;
      resultBadge(card.querySelector('.result'), c, t);
      SV.record(sec.id, 'e' + idx, c, t);
      refreshScores();
      if (c === t) SV.toast('¡Excelente! 만점이에요 🎉');
    });
    card.querySelector('[data-act=reset]').addEventListener('click', () => {
      const fresh = (R[ex.k] || R.fill)(ex);
      body.innerHTML = fresh.html; if (fresh.bind) fresh.bind(body);
      Object.assign(r, fresh);
      card.querySelector('.result').className = 'result';
    });
    const rv = card.querySelector('[data-act=reveal]');
    if (rv) rv.addEventListener('click', () => r.reveal(body));
  }

  /* ---------------- section ---------------- */
  function refreshScores() {
    const P = SV.load();
    const s = P[cur.id] || {};
    const strip = document.getElementById('score-strip');
    if (!strip) return;
    const parts = [];
    cur.grids.forEach((g, i) => { const v = s['g' + i]; parts.push(`<div class="score-pill">📋 표 ${i + 1} <b>${v ? Math.round(v[0] / v[1] * 100) : '–'}</b></div>`); });
    cur.ex.forEach((e, i) => { const v = s['e' + i]; parts.push(`<div class="score-pill">${LETTER[i]} <b>${v ? v[0] + '/' + v[1] : '–'}</b></div>`); });
    const sc = SV.secScore(cur.id, P);
    strip.innerHTML = `<div class="score-pill" style="background:var(--ink);color:#fff;border-color:var(--ink)">섹션 진도 <b>${Math.min(100, Math.round(sc.c / (cur.total || 1) * 100))}%</b></div>` + parts.join('');
    renderNavScores(P);
  }
  function renderNavScores(P) {
    nav.querySelectorAll('a.s').forEach(a => { a.querySelector('.pct').textContent = pctText(C.sections.find(s => s.id === a.dataset.s), P); });
  }

  function renderSection() {
    nav.querySelectorAll('a.s').forEach(a => a.classList.toggle('on', a.dataset.s === cur.id));
    const onA = nav.querySelector('a.s.on'); if (onA && innerWidth <= 900) nav.scrollLeft = onA.offsetLeft - 120;
    try { localStorage.setItem('sv_last', JSON.stringify({ ch: C.ch, s: cur.id })); } catch (e) {}
    const idx = C.sections.indexOf(cur);
    const prev = C.sections[idx - 1], next = C.sections[idx + 1];
    const tag = SV.tenseTag(cur.en);
    main.innerHTML = `
      <div class="sec-header">
        <div class="kicker">CHAPTER ${C.ch} · ${cur.id} <span class="tag ${tag[1]}">${tag[0]}</span></div>
        <h1>${SV.esc(cur.ko)}</h1>
        <div class="en">${SV.esc(cur.en)}</div>
        <div class="score-strip" id="score-strip"></div>
      </div>
      ${cur.rule ? `<section class="card"><div class="card-h"><div class="badge rule">!</div><div><h2>규칙 정리</h2><div class="sub">Regla · 표의 스페인어를 누르면 발음을 들을 수 있어요</div></div></div><div class="card-b rule">${md(cur.rule)}</div></section>` : ''}
      ${cur.grids.length ? `<section class="card" id="grid-card"><div class="card-h"><div class="badge grid">📋</div><div><h2>동사표 채우기 · ${SV.esc(TENSE_KO[cur.grid] || '')}</h2><div class="sub">Completa la tabla · 총 ${cur.grids.reduce((a, g) => a + g.length, 0)}개 동사 · 노란 줄은 예시</div></div><div class="right"><button class="btn soft sm" id="drill-here">⚡ 드릴</button></div></div><div class="card-b"></div>
        <div class="card-f"><button class="btn go" data-act="check">✓ 채점하기</button><button class="btn" data-act="show">정답 보기</button><button class="btn" data-act="reset">↺ 지우기</button><span class="result"></span></div></section>` : ''}
      <div id="ex-list"></div>
      <div class="chap-nav" style="border:0;margin-top:10px">
        ${prev ? `<a href="?ch=${C.ch}&s=${prev.id}" data-go="${prev.id}">← ${prev.id} ${SV.esc(prev.ko)}</a>` : (C.ch > 1 ? `<a href="?ch=${C.ch - 1}">← 이전 챕터</a>` : '')}
        ${next ? `<a href="?ch=${C.ch}&s=${next.id}" data-go="${next.id}">${next.id} ${SV.esc(next.ko)} →</a>` : (C.ch < 24 ? `<a href="?ch=${C.ch + 1}">다음 챕터 →</a>` : '')}
      </div>`;
    if (cur.grids.length) {
      renderGrid(cur, document.getElementById('grid-card'));
      document.getElementById('drill-here').addEventListener('click', openDrill);
    }
    const list = document.getElementById('ex-list');
    cur.ex.forEach((ex, i) => renderExercise(cur, ex, i, list));
    main.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); cur = C.sections.find(s => s.id === a.dataset.go);
      history.replaceState(null, '', `?ch=${C.ch}&s=${cur.id}`); renderSection(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    document.getElementById('drill-open').style.display = cur.grids.length ? '' : 'none';
    refreshScores();
  }

  /* ---------------- drill ---------------- */
  const D = { ok: 0, n: 0, st: 0, q: null };
  const $ = id => document.getElementById(id);
  function drillNext() {
    const pool = [];
    cur.grids.forEach(g => g.forEach(r => r.f.forEach((f, ci) => { if (f) pool.push({ v: r.v, ci, f }); })));
    if (!pool.length) return;
    D.q = pool[Math.floor(Math.random() * pool.length)];
    $('d-pr').textContent = cur.cols[D.q.ci];
    $('d-vb').textContent = D.q.v;
    $('d-tn').textContent = TENSE_KO[cur.grid] || '';
    $('d-in').value = ''; $('d-in').style.borderColor = ''; $('d-in').focus();
  }
  function openDrill() {
    if (!cur.grids.length) return;
    $('drill').classList.add('open'); D.ok = D.n = D.st = 0; updDrill(); $('d-fb').textContent = ''; drillNext();
  }
  function updDrill() { $('d-ok').textContent = D.ok; $('d-n').textContent = D.n; $('d-st').textContent = D.st; }
  $('drill-open').addEventListener('click', openDrill);
  $('drill-x').addEventListener('click', () => $('drill').classList.remove('open'));
  $('drill').addEventListener('click', e => { if (e.target.id === 'drill') $('drill').classList.remove('open'); });
  $('d-in').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !D.q) return;
    const st = SV.compare($('d-in').value, D.q.f.split('/'));
    D.n++;
    if (st === 'ok') { D.ok++; D.st++; $('d-fb').innerHTML = `<span style="color:var(--ok)">✓ ¡Correcto! ${SV.esc(D.q.f)}</span>`; SV.speak(D.q.f); }
    else { D.st = 0; $('d-fb').innerHTML = `<span style="color:${st === 'acc' ? 'var(--warn)' : 'var(--bad)'}">${st === 'acc' ? '악센트 확인!' : '✗'} 정답: ${SV.esc(D.q.f)}</span>`; }
    updDrill();
    setTimeout(drillNext, st === 'ok' ? 700 : 1600);
  });

  renderNav();
  renderSection();
  SV.mountVoicePanel();
  SV.mountAccentKeyboard();
})();
