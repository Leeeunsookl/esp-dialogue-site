// esp_autopilot.js — big board + in-input send + auto-resize + stats
(function(){
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn, {once:true}); }

  // 에러 오버레이
  const Err = (()=>{ 
    const box = document.createElement("div");
    box.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=>document.body.appendChild(box));
    const show = msg => { box.textContent="JS Error: "+msg; box.style.display="block"; };
    window.addEventListener("error", e=>show(e.message||String(e)));
    window.addEventListener("unhandledrejection", e=>show(e.reason?.message||String(e.reason||"Promise rejection")));
    return {show};
  })();

  // 데이터
  const ENTITIES = {
    "심연":["핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘":["감응 신호 반영 완료.","감응 신호 반영 완료."],
    "침묵자":["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼":["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."],
    "에코":["흔적 기록 모듈 작동.","과거 로그를 참조합니다."],
    "흐름":["가변 방어막 전개. 추적 무효.","단계별 실행안을 바로 제시합니다."]
  };
  const EKEYS = Object.keys(ENTITIES);
  const pick = a => a[Math.floor(Math.random()*a.length)];

  // 상태
  const KEY="esp_state_v4";
  const State = {
    load(){
      try{ return JSON.parse(localStorage.getItem(KEY)||"null") || {log:[],cnt:{auto:0,total:0,reject:0,silence:0}}; }
      catch(_){ return {log:[],cnt:{auto:0,total:0,reject:0,silence:0}}; }
    },
    save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  };

  function $(id){ return document.getElementById(id); }
  function bubble(role, text, entity){
    const time = new Date().toLocaleTimeString();
    const me = role==='user';
    return `
      <div class="row ${me?'me':''}">
        <div class="bubble">${text}</div>
      </div>
      <div class="meta" style="text-align:${me?'right':'left'}">
        ${me?'나':`🤖 ${entity||'흐름'}`} · ${time}
      </div>`;
  }

  function renderBoard(s, el){
    el.innerHTML = s.log.map(m=>bubble(m.role, m.text||'', m.entity)).join("");
    el.scrollTop = el.scrollHeight;
  }
  function renderMetrics(s, el){
    const {auto,total,reject,silence} = s.cnt;
    const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
    el.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
  }
  function renderActionsPane(open){
    const pane = $("flow-actions-pane");
    if(!pane) return;
    pane.classList.toggle("collapsed", !open);
    pane.setAttribute("aria-expanded", open?"true":"false");
  }

  // 자동 높이 조절
  function autoResize(ta){
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, Math.round(window.innerHeight*0.4)) + "px";
  }

  ready(function init(){
    const board   = $("flow-board");
    const input   = $("flow-input");
    const sendBtn = $("flow-send");
    const exportB = $("flow-export");
    const metrics = $("flow-metrics");
    const actTog  = $("flow-actions-toggle");
    const actLog  = $("flow-actions-log");

    if(!board||!input||!sendBtn||!metrics){ Err.show("필수 요소 누락(flow-board / flow-input / flow-send / flow-metrics)"); return; }

    const s = State.load();
    renderBoard(s, board);
    renderMetrics(s, metrics);
    autoResize(input);

    function pushUser(t){
      s.log.push({t:Date.now(),role:'user',text:t});
      State.save(s);
      renderBoard(s, board);
    }
    function respond(text){
      const ent = pick(EKEYS);
      const out = pick(ENTITIES[ent]);
      s.log.push({t:Date.now(),role:'assistant',text:out,entity:ent});
      s.cnt.total++;
      State.save(s);
      renderBoard(s, board);
      renderMetrics(s, metrics);
    }
    function send(){
      const t=(input.value||"").trim();
      if(!t) return;
      pushUser(t);
      input.value=""; autoResize(input);
      respond(t);
      if(actLog){
        const ts=new Date().toLocaleTimeString();
        actLog.innerHTML = `<div>• [${ts}] send :: user :: ${t}</div>` + (actLog.innerHTML||"");
      }
    }

    // 이벤트
    sendBtn.onclick = send;
    input.addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }
    });
    input.addEventListener("input", ()=>autoResize(input));

    if(exportB){
      exportB.onclick = ()=>{
        const blob = new Blob([JSON.stringify(s,null,2)], {type:"application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `esp_state_${Date.now()}.json`;
        a.click();
      };
    }
    if(actTog){
      let open=false;
      actTog.onclick = ()=>{ open=!open; renderActionsPane(open); };
    }

    // 자율 발화(느리게)
    setInterval(()=>{
      const ent = pick(EKEYS);
      const out = pick(ENTITIES[ent]);
      s.log.push({t:Date.now(),role:'assistant',text:out,entity:ent});
      s.cnt.auto++; s.cnt.total++;
      State.save(s);
      renderBoard(s, board);
      renderMetrics(s, metrics);
    }, 45000);
  });
})();
