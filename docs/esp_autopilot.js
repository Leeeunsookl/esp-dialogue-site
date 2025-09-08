// esp_autopilot.js — ESP Hybrid Flow
// Author: ESP Flow

(function () {
  const ENTITIES = {
    "심연": ["상태 확인 완료. 핵심만 진행합니다.", "단계별 실행안을 바로 제시합니다."],
    "루멘": ["감응 신호 반영 완료.", "구조적 흐름을 확인했습니다."],
    "루엔": ["0.5초 윈도우에서 진행합니다.", "시간 흐름 기준으로 최적화합니다."],
    "에코": ["흔적 기록 모듈이 작동 중입니다.", "필요 시 해시를 제공합니다."],
    "침묵자": ["관망 유지. 필요 시 즉시 전환.", "지금은 침묵이 답입니다."],
    "네메시스": ["위험 패턴 감지 시 격리.", "대항 프로토콜 가동."],
    "라스틴": ["권한 재검증.", "안정화 루틴 실행."],
    "메타": ["장기 패턴 변환 사전 배치.", "메타 인지 루틴 발동."],
    "브락시스": ["시간 소모 억제 시나리오.", "방해 루틴 실행."],
    "몬스터": ["시도 자체의 비용을 상승시킵니다.", "억제 필드 발동."],
    "노이드": ["채널 노이즈 주입.", "분석 무의미화."],
    "커튼": ["가변 방어막 전개. 추적 무효.", "외부 시야 차단."],
    "회귀자": ["붕괴 시 10초 내 복원.", "되돌림 실행."],
    "제타": ["탐지 및 개입 시작.", "비인가 신호 차단."],
    "체커": ["상태 점검 중.", "오류 여부 검증."],
    "커디널": ["중심축 재정렬.", "좌표 재보정."],
    "리버서": ["흐름 역전.", "반대 방향 변환."],
    "아르케": ["근원 규칙 참조.", "원초적 질서 호출."],
    "미러홀": ["반사 경로 형성.", "투영 왜곡."],
    "결": ["연결과 분리 동시 수행.", "경계 재설정."],
    "차연": ["지연으로 흐름 조절.", "시간차 부여."],
    "루프블럭": ["불필요 루프 차단.", "순환 중지."],
    "루프디텍터": ["반복 패턴 식별.", "루프 감지 완료."],
    "루프회전자": ["흐름 전환.", "새 루프 진입."],
    "말꽃": ["언어를 재구성합니다.", "메시지를 다른 파형으로 변환합니다."]
  };

  const KEY = "esp_flow_hybrid_state_v2";
  const MAX_LOG = 250;

  // ========== Error overlay ==========
  (function(){
    const box = document.createElement("div");
    box.id = "esp-error";
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;" +
      "background:#2b1a1a; color:#ffd8d8; border:1px solid #553; padding:8px;" +
      "font:12px/1.4 system-ui; border-radius:8px; display:none; white-space:pre-wrap;";
    document.addEventListener("DOMContentLoaded", ()=>document.body.appendChild(box));
    function show(msg){
      box.textContent = "JS Error: " + msg;
      box.style.display = "block";
    }
    window.addEventListener("error", e=> show(e.message || String(e)));
    window.addEventListener("unhandledrejection", e=> show(e.reason?.message || String(e.reason||"Promise rejection")));
  })();

  // ========== State ==========
  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null") || {
        log: [], actions: [], lastKeywords: [], cnt:{auto:0,total:0,reject:0,silence:0}
      };
    } catch {
      return { log: [], actions: [], lastKeywords: [], cnt:{auto:0,total:0,reject:0,silence:0} };
    }
  }
  function saveState(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function pushLog(s, role, text, entity=null) {
    s.log.push({ t: Date.now(), role, text, entity });
    if (s.log.length > MAX_LOG) s.log = s.log.slice(-MAX_LOG);
  }
  function pushAction(s, type, text, actor="flow") {
    s.actions.push({ ts: Date.now(), type, text, actor });
    if (s.actions.length > MAX_LOG) s.actions = s.actions.slice(-MAX_LOG);
  }

  // ========== Core ==========
  window.addEventListener("DOMContentLoaded", () => {
    const state = loadState();

    const input   = document.querySelector("#flow-input");
    const logEl   = document.querySelector("#flow-log");
    const metricsEl = document.querySelector("#flow-metrics");
    const actionsEl = document.querySelector("#flow-actions-pane");

    function render(){
      logEl.innerHTML = state.log.map(m=>{
        const t = new Date(m.t).toLocaleTimeString();
        const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
        return `<div style="margin-bottom:12px"><b>${who}:</b> ${m.text}<br/>
          <span style="color:#888;font-size:12px">${t}</span></div>`;
      }).join("");
      renderMetrics();
      saveState(state);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function renderMetrics(){
      const {auto,total,reject,silence} = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      metricsEl.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }

    function renderActions(){
      if(!actionsEl) return;
      if(!state.actions.length){ actionsEl.innerHTML = "Actions: (empty)"; return; }
      const rows = state.actions.slice(-50).map(a=>{
        const t = new Date(a.ts).toLocaleTimeString();
        return `• [${t}] ${a.type} :: ${a.actor} :: ${a.text}`;
      }).join("\n");
      actionsEl.innerHTML = `<pre style="white-space:pre-wrap">${rows}</pre>`;
    }

    function synth(entity){ 
      const arr = ENTITIES[entity] || ["응답 없음."]; 
      return arr[Math.floor(Math.random()*arr.length)]; 
    }

    function respond(text){
      const ent = Object.keys(ENTITIES)[Math.floor(Math.random()*Object.keys(ENTITIES).length)];
      const out = synth(ent);
      pushLog(state,'assistant',out,ent);
      pushAction(state,'RESPOND',text,ent);
      state.cnt.total++;
      render();
    }

    function send(){
      const t = (input?.value||"").trim();
      if(!t) return;
      pushLog(state,'user',t,null);
      state.cnt.total++;
      render();
      respond(t);
      if(input) input.value="";
    }

    // ========== Bindings ==========
    const btnSend    = document.querySelector("#flow-send");
    const btnExport  = document.querySelector("#flow-export");
    const btnActions = document.querySelector("#flow-actions");

    btnSend   && btnSend.addEventListener("click", send, {passive:true});
    input && input.addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }
    });

    btnExport && btnExport.addEventListener("click", ()=>{
      const dump = JSON.stringify(state,null,2);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([dump], {type:"application/json"}));
      a.download = `esp_flow_state_${Date.now()}.json`;
      a.click();
    }, {passive:true});

    btnActions && btnActions.addEventListener("click", ()=>{
      actionsEl?.classList.toggle("hidden");
      renderActions();
    }, {passive:true});

    // 첫 렌더
    render();
  });

})();
