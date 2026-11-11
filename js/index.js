(function () {
  const B = window.BOOK;
  const P = SV.load();
  const GROUPS = [
    [1, 8, '현재형 · Presente'], [9, 10, '명령형 · Imperativo'], [11, 14, '점과거 · Pretérito'], [15, 15, '불완료과거 · Imperfecto'],
    [16, 17, '미래 · 가정미래 · Futuro y Condicional'], [18, 18, '과거분사 · 현재완료'], [19, 20, '접속법 · Subjuntivo'],
    [21, 22, '현재분사 · 진행형'], [23, 24, '목적격 대명사 · gustar']
  ];
  const FILTERS = [['all', '전체'], ['t-pres', '현재'], ['t-cmd', '명령형'], ['t-pret', '점과거'], ['t-impf', '불완료'], ['t-fut', '미래·가정'], ['t-subj', '접속법'], ['t-etc', '분사·대명사']];
  let filter = 'all', query = '';

  // stats
  let nSec = 0, nItems = 0, nVerbs = 0, done = 0, total = 0;
  B.chapters.forEach(c => c.sections.forEach(s => {
    nSec++; nItems += s.items; nVerbs += s.verbs;
    const sc = SV.secScore(s.id, P); done += sc.c; total += s.total;
  }));
  const tried = Object.keys(P).length;
  document.getElementById('stats').innerHTML = `
    <div class="stat"><b>${B.chapters.length}</b><span>챕터</span></div>
    <div class="stat"><b>${nSec}</b><span>섹션</span></div>
    <div class="stat"><b>${nVerbs.toLocaleString()}</b><span>동사표 행</span></div>
    <div class="stat"><b>${nItems.toLocaleString()}</b><span>연습문제</span></div>
    <div class="stat"><b>${tried}</b><span>학습한 섹션</span></div>
    <div class="stat"><b>${total ? Math.round(done / total * 100) : 0}%</b><span>전체 진도</span></div>`;

  document.getElementById('chips').innerHTML = FILTERS.map(f => `<button class="chip ${f[0] === 'all' ? 'on' : ''}" data-f="${f[0]}">${f[1]}</button>`).join('');

  function secPct(s) {
    const sc = SV.secScore(s.id, P);
    return s.total ? Math.min(1, sc.c / s.total) : 0;
  }

  function render() {
    const el = document.getElementById('chapters');
    let html = '';
    GROUPS.forEach(([a, b, title]) => {
      const chs = B.chapters.filter(c => c.ch >= a && c.ch <= b);
      let cards = '';
      chs.forEach(c => {
        const secs = c.sections.filter(s => {
          const tag = SV.tenseTag(s.en)[1];
          if (filter !== 'all' && tag !== filter) return false;
          if (query) {
            const hay = (s.id + ' ' + s.en + ' ' + s.ko + ' ' + c.ko + ' ' + c.en).toLowerCase();
            if (!hay.includes(query)) return false;
          }
          return true;
        });
        if (!secs.length) return;
        const tags = [...new Set(c.sections.map(s => SV.tenseTag(s.en).join('|')))].map(t => { const [n, cl] = t.split('|'); return `<span class="tag ${cl}">${n}</span>`; }).join('');
        const pcts = c.sections.map(secPct);
        const avg = pcts.reduce((x, y) => x + y, 0) / pcts.length;
        cards += `<article class="ch-card">
          <a class="ch-head" href="chapter.html?ch=${c.ch}">
            <div class="ch-num">${c.ch}</div>
            <div><h3>${SV.esc(c.ko)}</h3><div class="en">Chapter ${c.ch} — ${SV.esc(c.en)}</div><div class="ch-tags">${tags}</div></div>
          </a>
          <ul class="sec-list">${secs.map(s => `<li><a href="chapter.html?ch=${c.ch}&s=${s.id}">
              <span class="sec-id">${s.id}</span>
              <span class="sec-t">${SV.esc(s.ko)}<div class="sec-meta">${SV.esc(s.en)}${s.verbs ? ` · 동사 ${s.verbs}` : ''}${s.items ? ` · 문제 ${s.items}` : ''}</div></span>
              ${SV.ring(secPct(s))}</a></li>`).join('')}</ul>
          <div class="ch-foot"><div class="bar"><i style="width:${Math.round(avg * 100)}%"></i></div><span>${Math.round(avg * 100)}%</span></div>
        </article>`;
      });
      if (cards) html += `<div class="group-title">${title}</div><div class="chapters">${cards}</div>`;
    });
    el.innerHTML = html || '<p class="empty-note">검색 결과가 없어요.</p>';
  }

  document.getElementById('chips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    render();
  });
  document.getElementById('q').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); render(); });
  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('저장된 모든 점수와 진도를 지울까요?')) { SV.save({}); localStorage.removeItem('sv_last'); location.reload(); }
  });
  try {
    const last = JSON.parse(localStorage.getItem('sv_last') || 'null');
    if (last) { const a = document.getElementById('continue'); a.href = `chapter.html?ch=${last.ch}&s=${last.s}`; a.querySelector('.lbl').textContent = `이어서 학습 (${last.s})`; }
  } catch (e) {}
  render();
  SV.mountVoicePanel();
})();
