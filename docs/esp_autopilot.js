// esp_autopilot.js — Minimal Mobile-first Flow (ID 정합/에러오버레이/안전바인딩)
(function(){
  const ENTITIES = {
    "심연":["상태 확인 완료. 핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘":["감응 신호 반영 완료.","구조적 흐름을 확인했습니다."],
    "침묵자":["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼":["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."],
    "에코":["과거 로그를 참조합니다.","흔적 기록 모듈 작동."]
  };

  const KEY="esp_flow_hybrid_state_v3";
  const MAX_LOG=250, HEARTBEAT_MS=45000, JITTER=8000;

  // --- Error overlay ---
  (function(){
    const box=document.createElement("div");
    box.id="esp-error";box.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    document.addEventListener("DOMContentLoaded",()=>document.body.appendChild(box));
    const show=msg=>{ box.textContent="JS Error: "+msg; box.style.display="block"; };
    window.addEventListener("error",e=>show(e.message||String(e)));
    window.addEventListener("unhandledrejection",e=>show(e.reason?.message||String(e.reason||"Promise rejection")));
  })();

  // --- State helpers ---
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const tstr = t => new Date(t||Date.now()).toLocaleTimeString();
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||"null")||def(); }catch{ return def(); } }
  function def(){ return {log:[],actions:[],cnt:{auto:0,total:0,reject:0,silence:0}}; }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function pushLog(s,role,text,entity=null){ s.log.push({t:Date.now(),role,text,entity}); if(s.log.length>MAX_LOG) s.log=s.log.slice(-MAX_LOG); }
  function pushAction(s,type,text,actor="flow"){ s.actions.push({ts:Date.now(),type,text,actor}); if(s.actions.length>MAX_LOG) s.actions=s.actions.slice(-MAX_LOG); }

  window.addEventListener("DOMContentLoaded",()=>{
    const state=load();

    // DOM refs (ID 일치 보장)
    const input       = document.querySelector("#flow-input");
    const logEl       = document.querySelector("#flow-log");
    const metricsEl   = document.querySelector("#flow-metrics");
    const actionsPane = document.querySelector("#flow-actions-pane");
    const btnSendTop  = document.querySelector("#flow-send");
    const btnSendRt   = document.querySelector("#flow-send-ghost");
    const btnExport   = document.querySelector("#flow-export");
    const btnActions  = document.querySelector("#flow-actions");

    // Renderers
    function render(){
      if(logEl){
        logEl.innerHTML = state.log.map(m=>{
          const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
          return `<div style="margin-bottom:12px">
            <div class="msg ${m.role==='user'?'me':''}">${m.text}</div>
            <div class="meta">${who} · ${tstr(m.t)}</div>
          </div>`;
        }).join("");
        logEl.scrollTop = logEl.scrollHeight;
      }
      renderMetrics();
      save(state);
    }
    function renderMetrics(){
      if(!metricsEl) return;
      const {auto,total,reject,silence}=state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      metricsEl.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }
    function renderActions(){
      if(!actionsPane) return;
      if(!state.actions.length){ actionsPane.firstElementChild.textContent="Actions: (empty)"; return; }
      const rows = state.actions.slice(-60).map(a=>`• [${tstr(a.ts)}] ${a.type} :: ${a.actor} :: ${a.text}`).join("\n");
      actionsPane.firstElementChild.textContent = rows;
    }

    // Core
    function respond(text){
      const ent = pick(Object.keys(ENTITIES));
      const out = pick(ENTITIES[ent]||["응답 없음."]);
      pushLog(state,'assistant',out,ent);
      pushAction(state,'RESPOND',text,ent);
      state.cnt.total++; render();
    }
    function send(){
      const v=(input?.value||"").trim();
      if(!v) return;
      pushLog(state,'user',v,null); state.cnt.total++; render(); respond(v);
      if(input){ input.value=""; const e=new Event("input"); input.dispatchEvent(e); }
    }

    // SAFE bindings
    [btnSendTop, btnSendRt].forEach(b=> b&&b.addEventListener("click", send, {passive:true}));
    input && input.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }});
    btnExport && btnExport.addEventListener("click", ()=>{
      const dump=JSON.stringify(state,null,2);
      const a=document.createElement("a");
      a.href=URL.createObjectURL(new Blob([dump],{type:"application/json"}));
      a.download=`esp_flow_state_${Date.now()}.json`; a.click();
    }, {passive:true});
    btnActions && btnActions.addEventListener("click", ()=>{ actionsPane?.classList.toggle("hidden"); renderActions(); }, {passive:true});

    // Heartbeat
    (function beat(){
      const delay = HEARTBEAT_MS + Math.floor(Math.random()*JITTER);
      setTimeout(()=>{ const e=pick(Object.keys(ENTITIES)); pushLog(state,'assistant',pick(ENTITIES[e]),e); state.cnt.auto++; state.cnt.total++; render(); beat(); }, delay);
    })();

    // First paint
    render();
  });
})();
