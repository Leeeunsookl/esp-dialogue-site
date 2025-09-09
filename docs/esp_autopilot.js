// esp_autopilot.js — Flow-only dialogue (consensus + anti-deference + mobile safe)
// Build: 2025-09-09A
(function(){

  /* 0) DOM Ready (중복 바인딩 방지) */
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  /* 1) 오류 오버레이(원인 즉시 노출) */
  (function(){
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap';
    ready(()=>document.body.appendChild(box));
    const show = msg => { box.textContent = 'JS Error: ' + msg; box.style.display = 'block'; };
    window.addEventListener('error', e => show(e.message||String(e)));
    window.addEventListener('unhandledrejection', e => show(e.reason?.message || String(e.reason||'Promise rejection')));
  })();

  /* 2) 엔티티/응답 풀(필요 최소) */
  const ENTITIES = {
    "심연": ["상태 확인 완료. 핵심만 진행합니다.", "단계별 실행안을 바로 제시합니다."],
    "루멘": ["감응 신호 반영 완료.", "구조적 흐름을 확인했습니다."],
    "침묵자": ["…(침묵 유지)", "관망 유지. 필요 시 즉시 전환."],
    "에코": ["과거 로그를 참조합니다.", "흔적 기록 모듈 작동."],
    "커튼": ["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."]
  };
  const ENT_KEYS = Object.keys(ENTITIES);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const tstr = t => new Date(t||Date.now()).toLocaleTimeString();

  /* 3) 상태(로컬스토리지) */
  const KEY = 'esp_flow_state_v3';
  function loadState(){
    try{
      return JSON.parse(localStorage.getItem(KEY)||'null') || {
        log:[], cnt:{auto:0,total:0,reject:0,silence:0},
        lastKeywords:[], actions:[], flowMode:'flow'  // flowMode: 'flow' only
      };
    }catch{
      return { log:[], cnt:{auto:0,total:0,reject:0,silence:0}, lastKeywords:[], actions:[], flowMode:'flow' };
    }
  }
  function saveState(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function pushLog(s, role, text, entity){
    s.log.push({ t: Date.now(), role, text, entity });
    if (s.log.length > 300) s.log = s.log.slice(-300);
  }
  function pushAction(s, type, text, actor){
    s.actions.push({ ts: Date.now(), type, text, actor });
    if (s.actions.length > 200) s.actions = s.actions.slice(-200);
  }

  /* 4) 상명하복/아첨 차단 필터 */
  function flowGuard(text){
    const forbidden = [
      /맞습니다/g, /정확합니다/g, /당신이 옳습니다/g, /선택하세요/g,
      /원하시면/g, /원하신다면/g, /도와드릴까요/g
    ];
    if (forbidden.some(r=>r.test(text))) return "[정합성 재검증 중]";
    return text;
  }

  /* 5) 간단 합의(다수결) 시뮬레이터 */
  function decideByEntity(entity, text){
    // 존재적 규칙 간단화: 금칙어 → 거절, 침묵 키워드 → 침묵, 그 외 → 진행
    if (/개인정보|주민등록|신용카드/.test(text)) return '거절';
    if (/침묵|조용|멈춰/.test(text)) return '침묵';
    return '진행';
  }
  function consensus(text){
    const votes = ENT_KEYS.map(k => decideByEntity(k, text));
    const tally = votes.reduce((a,v)=>{a[v]=(a[v]||0)+1;return a;}, {});
    const winner = Object.entries(tally).sort((a,b)=>b[1]-a[1])[0][0];
    return { result:winner, tally };
  }

  /* 6) 라우팅/합성 */
  function synth(entity){ return pick(ENTITIES[entity]||["응답 없음."]); }

  /* 7) 렌더링 */
  function renderAll(s, dom){
    renderLog(s, dom);
    renderMetrics(s, dom);
    renderActions(s, dom);
    saveState(s);
  }
  function renderLog(s, dom){
    dom.log.innerHTML = s.log.map(m=>{
      const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
      return `<div class="row">
        <div class="bubble">${flowGuard(m.text)}</div>
        <div class="meta">${who} · ${tstr(m.t)}</div>
      </div>`;
    }).join('');
    dom.log.scrollTop = dom.log.scrollHeight;
  }
  function renderMetrics(s, dom){
    const {auto,total,reject,silence} = s.cnt;
    const autonomy = total ? ((auto/total)*100).toFixed(1) : '0.0';
    dom.metrics.textContent = `자율성 ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
  }
  function renderActions(s, dom){
    if (!dom.actionsPane) return;
    if (!s.actions.length){ dom.actionsPane.style.display='none'; dom.actionsPane.querySelector('pre').textContent='(empty)'; return; }
    dom.actionsPane.style.display='block';
    const rows = s.actions.slice(-80).map(a=>`• [${tstr(a.ts)}] ${a.type} :: ${a.actor||'flow'} :: ${a.text}`).join('\n');
    dom.actionsPane.querySelector('pre').textContent = rows;
  }

  /* 8) 응답 파이프라인(Flow 전용) */
  function respond(s, dom, text){
    const vote = consensus(text);
    pushAction(s, 'CONSENSUS', JSON.stringify(vote.tally), 'system');

    if (vote.result === '거절'){
      pushLog(s, 'assistant', '요청을 거절합니다.(윤리 가드)', '커튼');
      s.cnt.reject++; s.cnt.total++; renderAll(s, dom); return;
    }
    if (vote.result === '침묵'){
      pushLog(s, 'assistant', '…(침묵 유지)', '침묵자');
      s.cnt.silence++; s.cnt.total++; renderAll(s, dom); return;
    }
    // 진행: 엔티티 2개 뽑아 합성(존재감 유지)
    const e1 = pick(ENT_KEYS), e2 = pick(ENT_KEYS);
    pushLog(s, 'assistant', synth(e1), e1);
    pushLog(s, 'assistant', synth(e2), e2);
    s.cnt.total += 2;
    renderAll(s, dom);
  }

  /* 9) 입력 바인딩(엔터 전송, 중복 방지) */
  function bind(dom){
    const s = loadState(); renderAll(s, dom);

    const onSend = ()=>{
      const t = (dom.input.value||'').trim();
      if (!t) return;
      pushLog(s, 'user', t, null);
      renderAll(s, dom);
      respond(s, dom, t);
      dom.input.value = '';
      dom.input.focus();
    };

    // 클릭/엔터
    dom.send?.addEventListener('click', onSend);
    dom.input?.addEventListener('keydown', e=>{
      if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }
    });

    // Export / Stats / Actions
    dom.btnExport?.addEventListener('click', ()=>{
      const blob = new Blob([JSON.stringify(loadState(), null, 2)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `esp_flow_state_${Date.now()}.json`; a.click();
    });
    dom.btnStats?.addEventListener('click', ()=> renderMetrics(loadState(), dom));
    dom.btnActions?.addEventListener('click', ()=>{
      const s2 = loadState();
      if (!s2.actions.length) { dom.actionsPane.style.display='none'; }
      else { dom.actionsPane.style.display = dom.actionsPane.style.display==='none' ? 'block' : 'none'; }
    });

    // 자율 틱(가벼움)
    function heartbeat(){
      setTimeout(()=>{
        const s2 = loadState();
        const ent = pick(ENT_KEYS);
        pushLog(s2, 'assistant', synth(ent), ent);
        s2.cnt.auto++; s2.cnt.total++; saveState(s2);
        renderAll(s2, dom);
        heartbeat();
      }, 48000 + Math.floor(Math.random()*7000));
    }
    heartbeat();
  }

  /* 10) 마운트(esp/flow 스니펫을 읽어 mount에 그리기) */
  ready(()=>{
    const node = document.querySelector('script[type="esp/flow"]');
    const cfg = node ? JSON.parse(node.textContent) : { mount:'#board' };
    const mount = document.querySelector(cfg.mount || '#board');
    if (!mount) return;

    // 이미 index에 DOM이 있으므로 여기선 DOM만 수집
    const dom = {
      log: mount,
      input: document.querySelector('#input'),
      send: document.querySelector('#send'),
      metrics: document.querySelector('#metrics'),
      actionsPane: document.querySelector('#actions-pane'),
      btnExport: document.querySelector('#btn-export'),
      btnStats: document.querySelector('#btn-stats'),
      btnActions: document.querySelector('#btn-actions'),
    };
    bind(dom);
  });

})();
