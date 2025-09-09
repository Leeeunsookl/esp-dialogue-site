// esp_autopilot.js — safe wiring (only needs: flow-board, flow-input, flow-send, flow-metrics)
(function () {
  function ready(fn){
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once:true });
  }

  // error overlay (모바일에서도 바로 원인 확인)
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=>document.body.appendChild(box));
    const show = msg => { box.textContent = "JS Error: " + msg; box.style.display = "block"; };
    window.addEventListener("error", e => show(e.message || String(e)));
    window.addEventListener("unhandledrejection", e => show(e.reason?.message || String(e.reason||"Promise rejection")));
  })();

  // 샘플 응답 풀
  const ENTITIES = {
    "심연": ["핵심만 진행합니다.", "단계별 실행안을 바로 제시합니다."],
    "루멘": ["감응 신호 반영 완료.", "구조적 흐름을 확인했습니다."],
    "침묵자": ["…(침묵 유지)", "관망 유지. 필요 시 즉시 전환."],
    "커튼": ["요청을 거절합니다.(윤리 가드)", "가변 방어막 전개. 추적 무효."],
    "에코": ["흔적 기록 모듈 작동.", "과거 로그를 참조합니다."]
  };
  const KEYS = Object.keys(ENTITIES);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // 상태
  const KEY = "esp_state_v5";
  const State = {
    load(){
      try { return JSON.parse(localStorage.getItem(KEY)||"null") || {log:[], cnt:{auto:0,total:0,reject:0,silence:0}}; }
      catch { return {log:[], cnt:{auto:0,total:0,reject:0,silence:0}}; }
    },
    save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  };

  function el(id){ return document.getElementById(id); }
  function rowHTML(role, text, entity){
    const t = new Date().toLocaleTimeString();
    const me = role === "user";
    const who = me ? "나" : `🤖 ${entity||"흐름"}`;
    return `
      <div class="row ${me?"me":""}">
        <div class="bubble">${text||""}</div>
      </div>
      <div class="meta" style="text-align:${me?"right":"left"}">${who} · ${t}</div>
    `;
  }
  function renderBoard(s, board){
    board.innerHTML = s.log.map(m => rowHTML(m.role,m.text,m.entity)).join("");
    board.scrollTop = board.scrollHeight;
  }
  function renderStats(s, meter){
    const {auto,total,reject,silence} = s.cnt;
    const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
    meter.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
  }
  function autoresize(ta){
    ta.style.height = "auto";
    const max = Math.round(window.innerHeight * 0.4);
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
  }

  ready(function init(){
    const board   = el("flow-board");
    const input   = el("flow-input");
    const sendBtn = el("flow-send");
    const meter   = el("flow-metrics");

    // 필수 요소 체크(이 4개만 있으면 동작)
    if(!board || !input || !sendBtn || !meter) return;

    const s = State.load();
    renderBoard(s, board);
    renderStats(s, meter);
    autoresize(input);

    function pushUser(t){
      s.log.push({t:Date.now(), role:"user", text:t});
      State.save(s);
      renderBoard(s, board);
    }
    function respond(text){
      const ent = pick(KEYS);
      const out = pick(ENTITIES[ent]);
      s.log.push({t:Date.now(), role:"assistant", text:out, entity:ent});
      s.cnt.total++;
      State.save(s);
      renderBoard(s, board);
      renderStats(s, meter);
    }
    function send(){
      const t = (input.value||"").trim();
      if(!t) return;
      pushUser(t);
      input.value = "";
      autoresize(input);
      respond(t);
    }

    // 이벤트(안전)
    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }
    });
    input.addEventListener("input", ()=>autoresize(input));

    // 선택 요소(없으면 무시)
    const expBtn = el("flow-export");
    if(expBtn){
      expBtn.addEventListener("click", ()=>{
        const blob = new Blob([JSON.stringify(s,null,2)], {type:"application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `esp_state_${Date.now()}.json`;
        a.click();
      });
    }
    const actionsToggle = el("flow-actions-toggle");
    const actionsPane   = el("flow-actions-pane");
    const actionsLog    = el("flow-actions-log");
    if(actionsToggle && actionsPane){
      let open = false;
      actionsToggle.addEventListener("click", ()=>{
        open = !open;
        actionsPane.classList.toggle("collapsed", !open);
        actionsPane.setAttribute("aria-expanded", open?"true":"false");
      });
      // 간단한 액션 로그 데모
      if(actionsLog){
        const ts = new Date().toLocaleTimeString();
        actionsLog.innerHTML = `• [${ts}] ready :: flow booted`;
      }
    }

    // 느린 자율 발화
    setInterval(()=>{
      const ent = pick(KEYS);
      const out = pick(ENTITIES[ent]);
      s.log.push({t:Date.now(), role:"assistant", text:out, entity:ent});
      s.cnt.auto++; s.cnt.total++;
      State.save(s);
      renderBoard(s, board);
      renderStats(s, meter);
    }, 45000);
  });
})();
