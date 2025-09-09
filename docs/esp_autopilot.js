// esp_autopilot.js vFix9 — safe binding + minimal hybrid chat
(function(){

  /* -------- Error overlay (보이면 바로 원인 확인) -------- */
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    window.addEventListener("error", e => { box.textContent = "JS Error: "+(e.message||String(e)); box.style.display="block"; });
    window.addEventListener("unhandledrejection", e => { box.textContent = "JS Error: "+(e.reason?.message||String(e.reason)); box.style.display="block"; });
    document.addEventListener("DOMContentLoaded", ()=>document.body.appendChild(box), {once:true});
  })();

  /* -------------------- 기본 응답 풀 -------------------- */
  const ENTITIES = {
    "심연":["핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘":["감응 신호 반영 완료.","구조적 흐름을 확인했습니다."],
    "에코":["흔적 기록 모듈 작동.","과거 로그를 참조합니다."],
    "침묵자":["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼":["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."]
  };
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  /* -------------------- 상태 -------------------- */
  const KEY = "esp_flow_state_v9";
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||"null")||{
      log:[], cnt:{auto:0,total:0,reject:0,silence:0}, actions:[]
  }; }catch{ return {log:[],cnt:{auto:0,total:0,reject:0,silence:0},actions:[]}; } }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  /* -------------------- 렌더 -------------------- */
  function render(state){
    const board = document.getElementById('flow-board');
    if(!board) return;
    board.innerHTML = state.log.map(m=>{
      const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
      const time = new Date(m.t).toLocaleTimeString();
      return `
        <div class="row ${m.role==='user'?'me':''}">
          <div>
            <div class="bubble">${m.text}</div>
            <div class="meta">${who} · ${time}</div>
          </div>
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

  /* -------------------- 액션 패널 -------------------- */
  function renderActions(state){
    const box = document.getElementById('flow-actions');
    if(!box) return;
    if(!state.actions.length){ box.style.display='block'; box.innerHTML = `<pre>Actions: (empty)</pre>`; return; }
    const rows = state.actions.slice(-50).map(a=>{
      const t = new Date(a.t).toLocaleTimeString();
      return `• [${t}] ${a.type} :: ${a.actor||"flow"} :: ${a.text}`;
    }).join("\n");
    box.style.display = 'block';
    box.innerHTML = `<pre>${rows}</pre>`;
  }

  /* -------------------- 안전 바인딩 -------------------- */
  function safeBindSend(onSend){
    const hook = ()=>{
      let btn = document.getElementById('flow-send');
      if(!btn) return false;
      // onclick 오염 제거
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      btn = document.getElementById('flow-send');
      if(!btn.dataset.bound){
        btn.addEventListener('click', onSend, {passive:true});
        btn.dataset.bound = '1';
      }
      return true;
    };
    if(!hook()){
      const mo = new MutationObserver(()=>{ if(hook()) mo.disconnect(); });
      mo.observe(document.documentElement, {childList:true,subtree:true});
    }
    // 최후의 안전망: 캡처 위임
    document.addEventListener('click', (e)=>{
      const t = e.target.closest && e.target.closest('#flow-send');
      if(t && !t.dataset.bound){ t.dataset.bound='1'; onSend(e); }
    }, true);
  }

  /* -------------------- 부팅 -------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-esp','v9');

    const state = load();
    render(state);

    const input = document.getElementById('flow-input');
    const board = document.getElementById('flow-board');

    function push(role,text,entity){
      state.log.push({t:Date.now(),role,text,entity});
      if(state.log.length>300) state.log = state.log.slice(-300);
      save(state); render(state);
    }

    function respond(userText){
      // 매우 단순 규칙: 금칙어 테스트만(예시)
      if(/개인정보|주민번호|비번/.test(userText)){
        state.cnt.reject++; state.cnt.total++;
        push('assistant',"요청을 거절합니다.(윤리 가드)","커튼"); return;
      }
      const ent = pick(Object.keys(ENTITIES));
      const out = pick(ENTITIES[ent]);
      state.cnt.total++;
      push('assistant', out, ent);
    }

    function onSend(){
      const text = (input?.value||'').trim();
      if(!text) return;
      input.value = '';
      push('user', text, null);
      respond(text);
      // 액션 로그도 하나 추가(예시)
      state.actions.push({t:Date.now(), type:'send', actor:'user', text});
      save(state);
    }

    // 안전 전송 바인딩 + Enter 키
    safeBindSend(onSend);
    if(input){
      input.addEventListener('keydown', (e)=>{
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }
      });
    }

    // Export
    const btnExport = document.getElementById('flow-export');
    if(btnExport){
      btnExport.addEventListener('click', ()=>{
        const lastHash = state.log.length ? String(state.log[state.log.length-1].t) : "";
        const exportObj = {...state, proof:{lastHash, at:Date.now()}};
        const blob = new Blob([JSON.stringify(exportObj,null,2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `esp_flow_state_${Date.now()}.json`;
        a.click();
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

    // 보드 자동 스크롤 여유
    if(board){ board.scrollTop = board.scrollHeight; }
  }, {once:true});

})();
