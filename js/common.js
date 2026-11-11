/* Shared helpers: storage, Spanish TTS voice selection, accent keyboard, normalisation */
(function () {
  const LS_KEY = 'sv_progress_v1';
  const VS_KEY = 'sv_voice_v1';

  const SV = (window.SV = {});

  /* ---------------- storage ---------------- */
  SV.load = function () {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  };
  SV.save = function (p) { try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch (e) {} };
  SV.record = function (secId, key, correct, total) {
    const p = SV.load();
    p[secId] = p[secId] || {};
    const prev = p[secId][key];
    // keep best score
    if (!prev || correct / total >= prev[0] / prev[1]) p[secId][key] = [correct, total];
    SV.save(p);
    return p;
  };
  SV.secScore = function (secId, p) {
    p = p || SV.load();
    const s = p[secId] || {};
    let c = 0, t = 0;
    Object.values(s).forEach(v => { c += v[0]; t += v[1]; });
    return { c, t };
  };

  /* ---------------- text helpers ---------------- */
  SV.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  SV.stripAcc = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  SV.norm = s => String(s).toLowerCase().replace(/[¿¡?!.,;:"“”«»()]/g, ' ').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  // returns 'ok' | 'acc' (only accents differ) | 'bad'
  SV.compare = function (given, answers) {
    const g = SV.norm(given);
    if (!g) return 'bad';
    for (const a of answers) if (SV.norm(a) === g) return 'ok';
    for (const a of answers) if (SV.stripAcc(SV.norm(a)).replace(/ñ/g, 'n') === SV.stripAcc(g).replace(/ñ/g, 'n')) return 'acc';
    return 'bad';
  };
  SV.shuffle = function (a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  SV.toast = function (msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
  };

  /* ---------------- Spanish voice ---------------- */
  const synth = window.speechSynthesis;
  let voices = [];
  const settings = Object.assign({ region: 'latam', voice: '', rate: 0.88 }, (() => { try { return JSON.parse(localStorage.getItem(VS_KEY) || '{}'); } catch (e) { return {}; } })());
  SV.voiceSettings = settings;
  const saveSettings = () => { try { localStorage.setItem(VS_KEY, JSON.stringify(settings)); } catch (e) {} };

  const GOOD_NAMES = /(natural|neural|online|premium|enhanced|siri|wavenet|studio)/i;
  const NICE_NAMES = /(paulina|m[oó]nica|jorge|juan|diego|dalia|elvira|[aá]lvaro|helena|laura|sabina|marisol|francisco|paloma|lupe|camila|valentina|jimena|elena|ximena|alonso|gonzalo|lorenzo|salom[eé]|catalina|larissa|renata|ines|in[eé]s|pablo|lucia|luc[ií]a)/i;
  function regionScore(lang) {
    lang = (lang || '').toLowerCase().replace('_', '-');
    if (settings.region === 'es') return lang === 'es-es' ? 40 : 0;
    // latam
    if (/^es-(mx|us|419|co|ar|cl|pe|ve|cu|do|pr|gt|cr|pa|ec|uy|py|bo|sv|hn|ni)/.test(lang)) return lang === 'es-mx' || lang === 'es-us' ? 40 : 34;
    return 0;
  }
  function score(v) {
    let s = 0;
    if (GOOD_NAMES.test(v.name)) s += 60;
    if (/google/i.test(v.name)) s += 35;
    if (/microsoft/i.test(v.name) && !GOOD_NAMES.test(v.name)) s -= 5;
    if (NICE_NAMES.test(v.name)) s += 15;
    if (!v.localService) s += 8;
    if (/eloquence|compact|espeak|grandma|grandpa|rocko|shelley|reed|sandy|flo|eddy/i.test(v.name)) s -= 50;
    s += regionScore(v.lang);
    return s;
  }
  SV.spanishVoices = function () {
    return voices.filter(v => /^es([-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a));
  };
  SV.bestVoice = function () {
    const list = SV.spanishVoices();
    if (settings.voice) {
      const v = list.find(x => x.voiceURI === settings.voice || x.name === settings.voice);
      if (v) return v;
    }
    return list[0] || null;
  };
  SV.isHighQuality = v => !!v && (GOOD_NAMES.test(v.name) || /google/i.test(v.name));

  function loadVoices() {
    voices = synth ? synth.getVoices() : [];
    document.dispatchEvent(new Event('sv-voices'));
  }
  if (synth) {
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 600);
  }

  let currentBtn = null;
  SV.speak = function (text, btn, opts) {
    if (!synth) { SV.toast('이 브라우저는 음성 기능을 지원하지 않아요.'); return; }
    opts = opts || {};
    text = String(text).replace(/___+/g, ' ').replace(/\s*\/\s*/g, ', ').replace(/\[|\]/g, '');
    synth.cancel();
    if (currentBtn) currentBtn.classList.remove('playing');
    const u = new SpeechSynthesisUtterance(text);
    const v = SV.bestVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = settings.region === 'es' ? 'es-ES' : 'es-MX';
    u.rate = opts.rate || settings.rate;
    u.pitch = 1;
    if (btn) { btn.classList.add('playing'); currentBtn = btn; u.onend = u.onerror = () => btn.classList.remove('playing'); }
    synth.speak(u);
  };

  SV.spkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
  SV.spkBtn = (text, title) => `<button class="spk" data-say="${SV.esc(text)}" title="${title || '듣기'}" aria-label="듣기">${SV.spkIcon}</button>`;

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-say]');
    if (b) { e.preventDefault(); SV.speak(b.getAttribute('data-say'), b.classList.contains('spk') ? b : null); }
  });

  /* ---------------- voice panel ---------------- */
  SV.mountVoicePanel = function () {
    const panel = document.createElement('div');
    panel.className = 'voice-panel';
    panel.innerHTML = `
      <h3>🔊 스페인어 음성 설정</h3>
      <p class="note">기기에 설치된 음성 중 가장 자연스러운 원어민 음성을 자동으로 고릅니다. 'Natural', 'Online', 'Google' 음성이 가장 자연스러워요.</p>
      <label>억양 (지역)</label>
      <div class="seg" id="vp-region"><button data-r="latam">🌎 중남미 (멕시코·미국)</button><button data-r="es">🇪🇸 스페인</button></div>
      <label for="vp-voice">음성 선택</label>
      <select id="vp-voice"></select>
      <div class="voice-quality" id="vp-q"></div>
      <label for="vp-rate">말하기 속도 <span id="vp-rv"></span></label>
      <input type="range" id="vp-rate" min="0.6" max="1.2" step="0.02">
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn soft" id="vp-test">▶ 들어보기</button>
        <button class="btn" id="vp-close" style="margin-left:auto">닫기</button>
      </div>`;
    document.body.appendChild(panel);
    const sel = panel.querySelector('#vp-voice');
    const rate = panel.querySelector('#vp-rate');
    function refresh() {
      panel.querySelectorAll('#vp-region button').forEach(b => b.classList.toggle('on', b.dataset.r === settings.region));
      const list = SV.spanishVoices();
      const best = SV.bestVoice();
      sel.innerHTML = list.length ? list.map(v => `<option value="${SV.esc(v.voiceURI)}" ${best && v.voiceURI === best.voiceURI ? 'selected' : ''}>${SV.esc(v.name)} (${v.lang})${SV.isHighQuality(v) ? ' ★' : ''}</option>`).join('')
        : '<option>스페인어 음성을 찾는 중…</option>';
      const q = panel.querySelector('#vp-q');
      if (!list.length) { q.className = 'voice-quality'; q.innerHTML = '스페인어 음성이 없어요. Chrome 또는 Edge 브라우저를 사용하거나, 기기 설정에서 스페인어 음성을 설치해 주세요.'; }
      else if (SV.isHighQuality(best)) { q.className = 'voice-quality good'; q.textContent = '✓ 자연스러운 고품질 원어민 음성을 사용 중입니다.'; }
      else { q.className = 'voice-quality'; q.innerHTML = '더 자연스러운 음성을 원하면 <b>Microsoft Edge</b>(Natural 음성) 또는 <b>Chrome</b>(Google español)을 사용해 보세요. iPhone/Mac은 설정 › 손쉬운 사용 › 음성 콘텐츠에서 "Mónica/Paulina (향상됨)"을 받을 수 있어요.'; }
      rate.value = settings.rate;
      panel.querySelector('#vp-rv').textContent = '×' + Number(settings.rate).toFixed(2);
    }
    panel.querySelector('#vp-region').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      settings.region = b.dataset.r; settings.voice = ''; saveSettings(); refresh();
    });
    sel.addEventListener('change', () => { settings.voice = sel.value; saveSettings(); refresh(); });
    rate.addEventListener('input', () => { settings.rate = Number(rate.value); saveSettings(); refresh(); });
    panel.querySelector('#vp-test').addEventListener('click', () => SV.speak('Hola, ¿qué tal? Yo hablo, tú hablas, nosotros hablamos. ¡Vamos a practicar los verbos!'));
    panel.querySelector('#vp-close').addEventListener('click', () => panel.classList.remove('open'));
    document.addEventListener('sv-voices', refresh);
    refresh();
    document.querySelectorAll('[data-voice-toggle]').forEach(b => b.addEventListener('click', () => { refresh(); panel.classList.toggle('open'); }));
  };

  /* ---------------- accent keyboard ---------------- */
  SV.mountAccentKeyboard = function () {
    const kb = document.createElement('div');
    kb.className = 'acc-kb';
    kb.innerHTML = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'].map(c => `<button type="button" tabindex="-1">${c}</button>`).join('');
    document.body.appendChild(kb);
    let last = null;
    document.addEventListener('focusin', e => {
      if (e.target.matches('input[type=text], input:not([type])') && !e.target.closest('.voice-panel') && !e.target.closest('.search')) { last = e.target; kb.classList.add('show'); }
    });
    document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input')) kb.classList.remove('show'); }, 150));
    kb.addEventListener('mousedown', e => e.preventDefault());
    kb.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !last) return;
      const s = last.selectionStart ?? last.value.length, en = last.selectionEnd ?? last.value.length;
      last.value = last.value.slice(0, s) + b.textContent + last.value.slice(en);
      last.setSelectionRange(s + 1, s + 1);
      last.dispatchEvent(new Event('input', { bubbles: true }));
      last.focus();
    });
  };

  SV.tenseTag = function (title) {
    const t = title.toLowerCase();
    if (/command/.test(t)) return ['명령형', 't-cmd'];
    if (/past subjunctive/.test(t)) return ['접속법 과거', 't-subj'];
    if (/subjunctive/.test(t)) return ['접속법 현재', 't-subj'];
    if (/preterite/.test(t)) return ['점과거', 't-pret'];
    if (/imperfect/.test(t)) return ['불완료과거', 't-impf'];
    if (/future/.test(t)) return ['미래', 't-fut'];
    if (/conditional/.test(t)) return ['가정미래', 't-fut'];
    if (/participle|perfect|progressive/.test(t)) return ['분사·진행·완료', 't-etc'];
    if (/pronoun|gustar/.test(t)) return ['대명사·gustar', 't-etc'];
    return ['현재', 't-pres'];
  };

  SV.ring = function (pct) {
    const r = 12, c = 2 * Math.PI * r, off = c * (1 - pct);
    const col = pct >= .9 ? '#1f8a4c' : pct >= .6 ? '#f2b705' : pct > 0 ? '#b8202c' : '#e7e1d5';
    return `<svg class="ring" viewBox="0 0 30 30"><circle cx="15" cy="15" r="${r}" fill="none" stroke="#f1ece2" stroke-width="4"/><circle cx="15" cy="15" r="${r}" fill="none" stroke="${col}" stroke-width="4" stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90 15 15)"/>${pct > 0 ? `<text x="15" y="18.5" text-anchor="middle" font-size="9" font-weight="800" fill="#4a5468">${Math.round(pct * 100)}</text>` : ''}</svg>`;
  };
})();
