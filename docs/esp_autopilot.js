// esp_autopilot.js — Multi-selector safe binding (no HTML changes required)
(function(){

  // 0) DOM ready 보장
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }

  // 1) 에러 오버레이(문구로 바로 원인 확인)
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=>document.body.appendChild(box));
    const show = msg => { box.textContent = "JS Error: " + msg; box.style.display = "block"; };
    window.addEventListener("error", e => show(e.message || String(e)));
    window.addEventListener("unhandledrejection", e => show(e.reason?.message || String(e.reason||"Promise rejection")));
  })();

  // 2) 샘플 응답 풀
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

  // 3) 상태
  const KEY = "esp_flow_hybrid_state_v3";
  const MAX_LOG = 250;
  const load  = () => { try { return JSON.parse(localStorage.getItem(KEY)||"null") || def(); } catch { return def(); } };
  const save  = s => localStorage.setItem(KEY, JSON.stringify(s));
  const def   = () => ({ log:[], actions:[], cnt:{auto:0,total:0,reject:0,silence:0} });
  const pushL = (s, role, text, entity=null)=>{ s.log.push({t:Date.now(),role,text,entity}); if(s.log.length>MAX_LOG) s.log=s.log.slice(-MAX_LOG); };
  const pushA = (s, type, text, actor="flow")=>{ s.actions.push({ts:Date.now(),type,text,actor}); if(s.actions.length>MAX_LOG) s.actions=s.actions.slice(-MAX_LOG); };

  // 4) 부드러운 query(여러 ID를 순서대로 시도)
  function qSel(list){
    for(const sel of list){
      const el = document.querySelector(sel);
      if(el) return el;
    }
    return null;
  }

  // 5) 메인
  function boot(){
    // HTML을 건드리지 않고, 기존/대체 ID 모두 지원
    const input     = qSel(["#flow-input","#input","textarea#input"]);
    const logEl     = qSel(["#flow-log","#board"]);
    const btnSend   = qSel(["#flow-send","#send"]);          // 상단 버튼
    const btnGhost  = qSel(["#flow-send-ghost"]);            // 우측 전송(있으면만)
    const metricsEl = qSel(["#flow-metrics","[data-role='metrics']"]); // 있으면만

    const state = load();

    function render(){
      if (logEl){
        logEl.innerHTML = state.log.map(m=>{
          const who = (m.role==='user') ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
          return `<div style="margin:12px 0">
            <div class="msg ${m.role==='user'?'me':''}">${m.text}</div>
            <div class="meta" style="color:#8a97a6;font-size:12px">${who} · ${tstr(m.t)}</div>
          </div>`;
        }).join("");
        logEl.scrollTop = logEl.scrollHeight;
      }
      if (metricsEl){
        const {auto,total,reject,silence} = state.cnt;
        const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
        metricsEl.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
      }
      save(state);
    }

    function respond(text){
      const ent = pick(ENT_KEYS);
      const out = pick(ENTITIES[ent] || ["응답 없음."]);
      pushL(state,'assistant',out,ent);
      pushA(state,'RESPOND',text,ent);
      state.cnt.total++;
      render();
    }

    function send(){
      const v = (input && typeof input.value==='string') ? input.value.trim() : "";
      if(!v) return;
      pushL(state,'user',v,null);
      state.cnt.total++;
      render();
      respond(v);
      if(input){ input.value=""; input.dispatchEvent(new Event("input")); }
    }

    // 전역 우회(HTML 수정 없이도 임시 호출 가능)
    window.__esp_send = send;

    // 안전 바인딩(존재하는 버튼만)
    btnSend  && btnSend.addEventListener("click", send, { passive:true });
    btnGhost && btnGhost.addEventListener("click", send, { passive:true });
    input    && input.addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }
    });

    render();
  }

  ready(()=> boot());
})();1
