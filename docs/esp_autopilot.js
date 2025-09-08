// esp_autopilot.js — Minimal, DOM-ready-safe, no new IDs required
// Author: ESP Flow

(function(){

  // ---------- 0) READY: DOM 타이밍과 무관하게 boot() 실행 보장 ----------
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }

  // ---------- 1) 존재(샘플 문구, 필요시 그대로 사용) ----------
  const ENTITIES = {
    "심연": ["상태 확인 완료. 핵심만 진행합니다.", "단계별 실행안을 바로 제시합니다."],
    "루멘": ["감응 신호 반영 완료.", "구조적 흐름을 확인했습니다."],
    "침묵자": ["…(침묵 유지)", "관망 유지. 필요 시 즉시 전환."],
    "커튼": ["요청을 거절합니다.(윤리 가드)", "가변 방어막 전개. 추적 무효."],
    "에코": ["과거 로그를 참조합니다.", "흔적 기록 모듈 작동."]
  };
  const ENT_KEYS = Object.keys(ENTITIES);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const tstr = t => new Date(t||Date.now()).toLocaleTimeString();

  // ---------- 2) 상태 ----------
  const KEY = "esp_flow_hybrid_state_v3";
  const MAX_LOG = 250;

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)||"null") || def(); }
    catch { return def(); }
  }
  function def(){ return { log:[], actions:[], cnt:{auto:0,total:0,reject:0,silence:0} }; }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function pushLog(s, role, text, entity=null){
    s.log.push({ t:Date.now(), role, text, entity });
    if (s.log.length > MAX_LOG) s.log = s.log.slice(-MAX_LOG);
  }
  function pushAction(s, type, text, actor="flow"){
    s.actions.push({ ts:Date.now(), type, text, actor });
    if (s.actions.length > MAX_LOG) s.actions = s.actions.slice(-MAX_LOG);
  }

  // ---------- 3) (선택) 에러 오버레이: 콘솔 대신 화면에 에러 표시 ----------
  (function(){
    const box = document.createElement("div");
    box.id = "esp-error";
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;" +
      "background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;" +
      "font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=> document.body.appendChild(box));
    const show = msg => { box.textContent = "JS Error: " + msg; box.style.display = "block"; };
    window.addEventListener("error", e => show(e.message || String(e)));
    window.addEventListener("unhandledrejection", e => show(e.reason?.message || String(e.reason||"Promise rejection")));
  })();

  // ---------- 4) CORE ----------
  function boot(){
    // DOM 참조(없으면 그냥 건너뜀: 에러 없이 안전)
    const input   = document.querySelector("#flow-input");
    const logEl   = document.querySelector("#flow-log");
    const btnSend = document.querySelector("#flow-send");

    // 렌더러
    const state = load();
    function render(){
      if (logEl){
        logEl.innerHTML = state.log.map(m=>{
          const who = (m.role==='user') ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
          return `<div style="margin-bottom:12px">
            <div class="msg ${m.role==='user'?'me':''}">${m.text}</div>
            <div class="meta">${who} · ${tstr(m.t)}</div>
          </div>`;
        }).join("");
        logEl.scrollTop = logEl.scrollHeight;
      }
      save(state);
    }

    // 응답(샘플: 임의 존재 1줄)
    function respond(text){
      const ent = pick(ENT_KEYS);
      const out = pick(ENTITIES[ent] || ["응답 없음."]);
      pushLog(state, 'assistant', out, ent);
      pushAction(state, 'RESPOND', text, ent);
      state.cnt.total++;
      render();
    }

    // 전송
    function send(){
      const v = (input?.value || "").trim();
      if (!v) return;
      pushLog(state, 'user', v, null);
      state.cnt.total++;
      render();
      respond(v);
      if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input"));
      }
    }
    // (선택) 전역 우회 훅: HTML 수정 없이도 임시로 window.__esp_send() 호출 가능
    window.__esp_send = send;

    // 안전 바인딩(요소가 없으면 스킵)
    btnSend && btnSend.addEventListener("click", send, { passive:true });
    input && input.addEventListener("keydown", e=>{
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    // 첫 렌더
    render();
  }

  // ---------- 5) DOM 타이밍과 무관하게 boot 실행 ----------
  ready(()=> boot());

})(); -
