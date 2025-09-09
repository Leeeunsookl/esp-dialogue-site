// esp_autopilot.js vFix10 — auto-tag send button near the input + IME-safe send
(function(){

  /* -------- Error overlay -------- */
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    window.addEventListener("error", e => { box.textContent = "JS Error: "+(e.message||String(e)); box.style.display="block"; });
    window.addEventListener("unhandledrejection", e => { box.textContent = "JS Error: "+(e.reason?.message||String(e.reason)); box.style.display="block"; });
    document.addEventListener("DOMContentLoaded", ()=>document.body.appendChild(box), {once:true});
  })();

  /* -------- Sample entities -------- */
  const ENTITIES = {
    "심연":["핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘":["감응 신호 반영 완료.","구조적 흐름을 확인했습니다."],
    "에코":["흔적 기록 모듈 작동.","과거 로그를 참조합니다."],
    "침묵자":["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼":["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."]
  };
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  /* -------- State -------- */
  const KEY = "esp_flow_state_v10";
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||"null")||{log:[],cnt:{auto:0,total:0,reject:0,silence:0},actions:[]}; }catch{ return {log:[],cnt:{auto:0,total:0,reject:0,silence:0},actions:[]}; } }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  /* -------- Render -------- */
  function render(state){
    const board = document.getElementById('flow-board');
    if(!board) return;
    board.innerHTML = state.log.map(m=>{
      const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
      const time = new Date(m.t).toLocaleTimeString();
      return `<div class="row${m.role==='user'?' me':''}">
        <div class="bubble">${m.text}</div>
        <div class="meta">${who} · ${time}</div>
      </div>`;
    }).join("");
    board.scrollTop = board.scrollHeight;

    const mt = document.getElementById('flow-metrics');
    if(mt){
      const {auto,total,reject,silence} = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      mt.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }
  }
  function renderActions(state){
    const box = document.getElementById('flow-actions');
    if(!box) return;
    if(!state.actions.length){ box.style.display='block'; box.innerHTML = `<pre>Actions: (empty)</pre>`; return; }
    const rows = state.actions.slice(-50).map(a=>{
      const t = new Date(a.t).toLocaleTimeString();
      return `• [${t}] ${a.type} :: ${a.actor||"flow"} :: ${a.text}`;
    }).join("\n");
    box.style.display='block'; box.innerHTML = `<pre>${rows}</pre>`;
  }

  /* -------- UI auto-tagging (핵심) -------- */
  function isVisible(el){ return !!(el && el.offsetParent !== null); }

  function autoTagUI(){
    // 1) 입력창 찾기(보이는 것 우선)
    const inputs = Array.from(document.querySelectorAll(
      'textarea, input[type="text"], input[type="search"]'
    )).filter(isVisible);
    const input = inputs.at(-1) || null; // 화면 아래쪽에 있는 걸 선호
    if (input && input.id !== 'flow-input') input.id = 'flow-input';

    // 2) 전송 버튼 찾기: (a) aria-label / 텍스트 (b) 입력 근처 버튼 (c) 화면 내 마지막 큰 버튼
    let btn =
      document.querySelector('#flow-send') ||
      document.querySelector('[aria-label*="send" i], [aria-label*="전송"], button.send, .send');

    if(!btn && input){
      // 입력창 조상 3단계 안에서 버튼 탐색, 입력 오른쪽/아래쪽 버튼 선호
      let p = input, depth = 0, candidates = [];
      while (p && depth < 3){
        candidates = candidates.concat(Array.from(p.querySelectorAll('button, [role="button"]')).filter(isVisible));
        p = p.parentElement; depth++;
      }
      // 우측/하단에 있는 버튼 가중치
      const ir = input.getBoundingClientRect();
      candidates.sort((a,b)=>{
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
        const aw = (ar.left >= ir.right-4 ? 2 : 0) + (ar.top >= ir.top-6 ? 1 : 0);
        const bw = (br.left >= ir.right-4 ? 2 : 0) + (br.top >= ir.top-6 ? 1 : 0);
        return bw - aw; // 점수 높은 게 먼저
      });
      btn = candidates[0];
    }
    if(!btn){
      // 마지막 fallback: 화면의 마지막 버튼
      const all = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible);
      btn = all.at(-1) || null;
    }
    if (btn && btn.id !== 'flow-send') btn.id = 'flow-send';
  }

  /* -------- Safe binding to send -------- */
  function safeBindSend(onSend){
    const hook = ()=>{
      autoTagUI();
      let btn = document.getElementById('flow-send');
      if(!btn) return false;

      // onclick 오염 제거
      const cloned = btn.cloneNode(true);
      btn.replaceWith(cloned);
      btn = document.getElementById('flow-send') || cloned; // 방어

      if(!btn.dataset.bound){
        ['click','pointerup','touchend','mouseup','keyup'].forEach(ev=>{
          btn.addEventListener(ev, (e)=>{
            if(ev==='keyup' && e.key!=='Enter') return;
            e.preventDefault?.(); e.stopPropagation?.();
            onSend();
          }, { passive:false });
        });
        btn.dataset.bound = '1';
      }
      return true;
    };

    if(!hook()){
      const mo = new MutationObserver(()=>{ if(hook()) mo.disconnect(); });
      mo.observe(document.documentElement, {childList:true,subtree:true});
    }

    // 최후의 위임(캡처): id가 늦게 붙어도 처리
    document.addEventListener('click', (e)=>{
      const t = e.target.closest && e.target.closest('#flow-send');
      if(t && !t.dataset.bound){ t.dataset.bound='1'; onSend(); }
    }, true);
  }

  /* -------- Boot -------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-esp','v10');

    const state = load();
    render(state);

    const board = document.getElementById('flow-board');
    let input = document.getElementById('flow-input');

    function refreshInput(){ autoTagUI(); input = document.getElementById('flow-input') || input; }

    function push(role,text,entity){
      state.log.push({t:Date.now(),role,text,entity});
      if(state.log.length>300) state.log = state.log.slice(-300);
      save(state); render(state);
    }
    function respond(userText){
      if(/개인정보|주민번호|비번/.test(userText)){
        state.cnt.reject++; state.cnt.total++;
        push('assistant',"요청을 거절합니다.(윤리 가드)","커튼"); return;
      }
      const ent = pick(Object.keys(ENTITIES));
      const out = pick(ENTITIES[ent]);
      state.cnt.total++; state.cnt.auto++;
      push('assistant', out, ent);
    }
    function onSend(){
      refreshInput();
      const text = (input?.value||'').trim();
      if(!text) return;
      input.value = '';
      push('user', text, null);
      respond(text);
      state.actions.push({t:Date.now(), type:'send', actor:'user', text});
      save(state);
      input?.focus();
    }

    // 바인딩
    safeBindSend(onSend);

    // Enter 전송 (IME 안전)
    let composing=false;
    document.addEventListener('compositionstart', ()=>composing=true, {capture:true});
    document.addEventListener('compositionend', ()=>composing=false, {capture:true});
    document.addEventListener('keydown', (e)=>{
      if((e.target===input || e.target?.id==='flow-input') && e.key==='Enter' && !e.shiftKey && !composing){
        e.preventDefault(); onSend();
      }
    }, true);

    // Export
    const btnExport = document.getElementById('flow-export');
    if(btnExport){
      btnExport.addEventListener('click', ()=>{
        const lastHash = state.log.length ? String(state.log[state.log.length-1].t) : "";
        const exportObj = {...state, proof:{lastHash, at:Date.now()}};
        const blob = new Blob([JSON.stringify(exportObj,null,2)], {type:'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `esp_flow_state_${Date.now()}.json`; a.click();
      }, {passive:true});
    }

    // Actions 토글
    const btnAct = document.getElementById('flow-actions-btn');
    const pane = document.getElementById('flow-actions');
    if(btnAct && pane){
      btnAct.addEventListener('click', ()=>{
        if(pane.style.display==='block'){ pane.style.display='none'; }
        else { renderActions(state); }
      }, {passive:true});
    }

    // 보드 스크롤
    if(board){ board.scrollTop = board.scrollHeight; }
  }, {once:true});

})();
