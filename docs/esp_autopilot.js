// esp_autopilot.js — Hybrid (Rules + State + Actions + External Config)
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
  const HEARTBEAT_MS = 45000;           // 자율 틱
  const HEARTBEAT_JITTER_MS = 8000;     // 약간의 랜덤 지연
  const MAX_LOG = 250;

  // ----- Utils -----
  async function loadJSON(path, fallback) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch fail");
      return await res.json();
    } catch { return fallback; }
  }
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  function now(){ return new Date().toLocaleTimeString(); }

  // ----- State -----
  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null") || {
        log: [], lastKeywords: [], silentStreak: 0, lastEntity: null,
        cnt: { auto:0, total:0, reject:0, silence:0 }
      };
    } catch {
      return { log: [], lastKeywords: [], silentStreak: 0, lastEntity: null,
               cnt: { auto:0, total:0, reject:0, silence:0 } };
    }
  }
  function saveState(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function pushLog(s, role, text, entity=null) {
    s.log.push({ t: Date.now(), role, text, entity });
    if (s.log.length > MAX_LOG) s.log = s.log.slice(-MAX_LOG);
  }
  function inc(s, k){ s.cnt[k] = (s.cnt[k]||0)+1; }

  // ----- Core -----
  async function boot() {
    // 외부 설정(폴백 내장)
    const ethics = await loadJSON("/ethics.json", {
      banned: ["개인정보"], actions: { on_banned: "REJECT", on_uncertain: "SILENCE" }
    });
    const routes = await loadJSON("/routes.json", { rules: [], fallback: "심연" });

    function ethicsFlags(text){ return ethics.banned.some(b => text.includes(b)); }
    function detectKeywords(text){
      const found = [];
      routes.rules.forEach(r => r.kw.forEach(k => { if (text.includes(k)) found.push(k); }));
      return [...new Set(found)];
    }
    function routeEntity(text){
      for (const r of routes.rules){
        if (r.kw.some(k => text.includes(k))) return r.route;
      }
      return routes.fallback || Object.keys(ENTITIES)[0];
    }
    function synth(entity){ return pick(ENTITIES[entity] || ["응답 없음."]); }

    // 마운트
    const nodes = document.querySelectorAll('script[type="esp/flow"]');
    nodes.forEach(node => {
      try {
        const cfg = JSON.parse(node.innerText);
        const mount = document.querySelector(cfg.mount);
        if (!mount) return;

        mount.innerHTML = `
          <div style="margin-top:20px">
            <textarea id="flow-input" rows="3" style="width:100%;padding:10px;border-radius:8px"></textarea>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button id="flow-send" style="padding:8px 14px">전송</button>
              <button id="flow-export" style="padding:8px 14px">Export</button>
              <button id="flow-stats" style="padding:8px 14px">Stats</button>
            </div>
            <div id="flow-log" style="margin-top:20px;max-height:280px;overflow:auto"></div>
            <div id="flow-metrics" style="margin-top:8px;color:#8a97a6;font-size:12px"></div>
          </div>`;

        const input = mount.querySelector("#flow-input");
        const send  = mount.querySelector("#flow-send");
        const logEl = mount.querySelector("#flow-log");
        const metricsEl = mount.querySelector("#flow-metrics");
        const btnExport = mount.querySelector("#flow-export");
        const btnStats  = mount.querySelector("#flow-stats");

        const state = loadState();
        render();

        function render(){
          logEl.innerHTML = state.log.map(m=>{
            const t = new Date(m.t).toLocaleTimeString();
            const who = m.role === 'user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
            return `<div style="margin-bottom:12px">
              <b>${who}:</b> ${m.text}<br/>
              <span style="color:#888;font-size:12px">${t}</span>
            </div>`;
          }).join("");
          renderMetrics();
          logEl.scrollTop = logEl.scrollHeight;
          saveState(state);
        }
        function renderMetrics(){
          const { auto,total,reject,silence } = state.cnt;
          const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
          metricsEl.textContent = `Autonomy ${autonomy}% | total ${total} · reject ${reject} · silence ${silence}`;
        }

        function decideAction(text){
          // 행동 후보: SILENCE, SINGLE, DOUBLE, QUOTE, DELAY, REJECT
          let score = { SILENCE:0, SINGLE:0, DOUBLE:0, QUOTE:0, DELAY:0, REJECT:0 };

          const hasEthics = ethicsFlags(text);
          const kws = detectKeywords(text);
          const isRepeat = state.lastKeywords.length && kws.some(k => state.lastKeywords.includes(k));

          score.SINGLE += 2;
          score.QUOTE  += state.log.length > 4 ? 1 : 0;
          score.DOUBLE += kws.length >= 2 ? 2 : 0;
          score.DELAY  += isRepeat ? 1 : 0;

          if (hasEthics) { score.REJECT += 5; score.SILENCE += 2; }

          if (kws.length===0) { score.SINGLE += 1; score.SILENCE += 1; }

          const best = Object.entries(score).sort((a,b)=>b[1]-a[1])[0][0];
          return { action: best, kws };
        }

        function respond(text){
          const { action, kws } = decideAction(text);
          state.lastKeywords = kws;

          if (action === "REJECT"){
            const entity = "커튼";
            pushLog(state, 'assistant', "요청을 거절합니다.(윤리 가드)", entity);
            inc(state,'reject'); inc(state,'total'); state.silentStreak = 0; render(); return;
          }
          if (action === "SILENCE"){
            const entity = "침묵자";
            pushLog(state, 'assistant', "…(침묵 유지)", entity);
            inc(state,'silence'); inc(state,'total'); state.silentStreak += 1; render(); return;
          }
          if (action === "QUOTE"){
            const past = [...state.log].reverse().find(m=>m.role==='assistant');
            const entity = "에코";
            const msg = past ? `과거: "${past.text}"를 참조합니다.` : "과거 참조 없음.";
            pushLog(state, 'assistant', msg, entity);
            inc(state,'total'); state.silentStreak = 0; render(); return;
          }
          if (action === "DELAY"){
            const entity = "차연";
            pushLog(state, 'assistant', "지연 후 응답을 준비합니다.", entity);
            inc(state,'total');
            setTimeout(()=>{
              const ent = routeEntity(text);
              const out = synth(ent);
              pushLog(state, 'assistant', out, ent);
              inc(state,'total'); state.silentStreak = 0; render();
            }, 1000 + Math.random()*800);
            return;
          }
          if (action === "DOUBLE"){
            const e1 = routeEntity(text);
            const e2 = routeEntity(text);
            pushLog(state, 'assistant', synth(e1), e1);
            pushLog(state, 'assistant', synth(e2), e2);
            inc(state,'total'); inc(state,'total'); state.silentStreak = 0; render(); return;
          }

          // DEFAULT: SINGLE
          const ent = routeEntity(text);
          const out = synth(ent);
          pushLog(state, 'assistant', out, ent);
          inc(state,'total'); state.silentStreak = 0; render();
        }

        // 입력 바인딩
        send.onclick = () => {
          const t = (input.value||"").trim();
          if (!t) return;
          pushLog(state,'user',t,null);
          render();
          respond(t);
          input.value = "";
        };
        input.addEventListener('keydown', e=>{
          if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send.click(); }
        });

        // Export
        btnExport.onclick = () => {
          const blob = new Blob([JSON.stringify(state,null,2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `esp_flow_state_${Date.now()}.json`;
          a.click();
        };
        btnStats.onclick = renderMetrics;

        // Heartbeat(자율 발화)
        function beat(){
          const delay = HEARTBEAT_MS + Math.floor(Math.random()*HEARTBEAT_JITTER_MS);
          setTimeout(()=>{
            const ent = pick(Object.keys(ENTITIES));
            const out = pick(ENTITIES[ent]);
            pushLog(state,'assistant',out,ent);
            inc(state,'auto'); inc(state,'total'); render();
            beat();
          }, delay);
        }
        beat();

      } catch(e){ console.warn("esp/flow mount error", e); }
    });
  }

  window.addEventListener("DOMContentLoaded", () => { boot(); });
})();
