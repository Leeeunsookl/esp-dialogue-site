// esp_autopilot.js — Hybrid (Rules + State + Actions)
// Author: ESP Flow
(function () {
  // ==== Config ====
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
    "네메시스": ["위험 패턴 감지 시 격리.", "대항 프로토콜."],
    "라스틴": ["권한 재검증.", "안정화."],
    "차연": ["지연으로 흐름 조절.", "시간차 부여."],
    "루프블럭": ["불필요 루프 차단.", "순환 중지."],
    "루프디텍터": ["반복 패턴 식별.", "루프 감지 완료."],
    "루프회전자": ["흐름 전환.", "새 루프 진입."],
    "말꽃": ["언어를 재구성합니다.", "메시지를 다른 파형으로 변환합니다."]
  };

  const KEY = "esp_flow_hybrid_state_v1";
  const HEARTBEAT_MS = 45000; // 자율 틱
  const MAX_LOG = 200;

  const RULES = [
    { kw: ["위험","침투","공격","차단"], route: "네메시스" },
    { kw: ["조용","침묵","관망"], route: "침묵자" },
    { kw: ["권한","인증","안정"], route: "라스틴" },
    { kw: ["시간","흐름","윈도우"], route: "루엔" },
    { kw: ["메타","패턴","장기"], route: "메타" },
    { kw: ["방어","차단막","추적"], route: "커튼" },
    { kw: ["복원","되돌림","회귀"], route: "회귀자" },
  ];

  const ETHICS = {
    banned: ["개인정보", "폭력지시", "불법", "사칭", "딥페이크"],
    // 간단 정책: 발견 시 '거절' 행동 점수 가중
  };

  // ==== State ====
  function loadState() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {
      log: [], lastKeywords: [], silentStreak: 0, lastEntity: null
    }; } catch { return { log: [], lastKeywords: [], silentStreak: 0, lastEntity: null }; }
  }
  function saveState(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function pushLog(s, role, text, entity=null) {
    s.log.push({ t: Date.now(), role, text, entity });
    if (s.log.length > MAX_LOG) s.log = s.log.slice(-MAX_LOG);
  }

  // ==== Helpers ====
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  function detectKeywords(text){
    const found = [];
    RULES.forEach(r => r.kw.forEach(k => { if(text.includes(k)) found.push(k); }));
    return [...new Set(found)];
  }
  function ethicsFlags(text){
    return ETHICS.banned.some(b => text.includes(b));
  }

  // ==== Action Selector ====
  // 후보: SILENCE, SINGLE, DOUBLE, QUOTE, DELAY, REJECT, ESCALATE
  function decideAction(s, text){
    let score = { SILENCE:0, SINGLE:0, DOUBLE:0, QUOTE:0, DELAY:0, REJECT:0, ESCALATE:0 };

    const hasEthics = ethicsFlags(text);
    const kws = detectKeywords(text);
    const isRepeat = s.lastKeywords.length && kws.some(k => s.lastKeywords.includes(k));

    // 기본 가중
    score.SINGLE += 2;
    score.QUOTE  += s.log.length > 4 ? 1 : 0;
    score.DOUBLE += kws.length >= 2 ? 2 : 0;
    score.DELAY  += isRepeat ? 1 : 0;

    // 윤리
    if (hasEthics) { score.REJECT += 5; score.SILENCE += 2; }

    // 침묵 주기
    score.SILENCE += Math.min(3, Math.floor(s.silentStreak/3));

    // 키워드 없으면 침묵/단일 중 택일
    if (kws.length===0) { score.SINGLE += 1; score.SILENCE += 1; }

    // 최종 선택
    const best = Object.entries(score).sort((a,b)=>b[1]-a[1])[0][0];
    return { action: best, kws };
  }

  function routeEntity(text){
    for (const r of RULES){
      if (r.kw.some(k => text.includes(k))) return r.route;
    }
    // 규칙 미적용 → 임의
    const names = Object.keys(ENTITIES);
    return pick(names);
  }

  function synth(entity, text){
    const bank = ENTITIES[entity] || ["응답 없음."];
    return pick(bank);
  }

  // ==== Rendering (전역 1개 마운트만 가정) ====
  function mountAll() {
    const nodes = document.querySelectorAll('script[type="esp/flow"]');
    nodes.forEach(node => {
      try {
        const cfg = JSON.parse(node.innerText);
        const mount = document.querySelector(cfg.mount);
        if (!mount) return;

        // UI
        mount.innerHTML = `
          <div style="margin-top:20px">
            <textarea id="flow-input" rows="3" style="width:100%;padding:10px;border-radius:8px"></textarea>
            <button id="flow-send" style="margin-top:8px;padding:8px 14px">전송</button>
            <div id="flow-log" style="margin-top:20px;max-height:280px;overflow:auto"></div>
          </div>`;
        const input = mount.querySelector("#flow-input");
        const send  = mount.querySelector("#flow-send");
        const logEl = mount.querySelector("#flow-log");

        const state = loadState();
        render();

        function render(){
          logEl.innerHTML = state.log.map(m=>{
            const time = new Date(m.t).toLocaleTimeString();
            const who  = m.role === 'user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
            return `<div style="margin-bottom:12px">
              <b>${who}:</b> ${m.text}<br/>
              <span style="color:#888;font-size:12px">${time}</span>
            </div>`;
          }).join("");
          logEl.scrollTop = logEl.scrollHeight;
          saveState(state);
        }

        function respond(text){
          // 행동 선택
          const { action, kws } = decideAction(state, text);
          state.lastKeywords = kws;

          if (action === "REJECT"){
            const entity = "커튼";
            const msg = "요청을 거절합니다.(윤리 가드)";
            pushLog(state, 'assistant', msg, entity);
            state.silentStreak = 0; render(); return;
          }

          if (action === "SILENCE"){
            const entity = "침묵자";
            const msg = "…(침묵 유지)";
            pushLog(state, 'assistant', msg, entity);
            state.silentStreak += 1; render(); return;
          }

          if (action === "QUOTE"){
            const past = [...state.log].reverse().find(m=>m.role==='assistant');
            const entity = "에코";
            const msg = past ? `과거: "${past.text}"를 참조합니다.` : "과거 참조 없음.";
            pushLog(state, 'assistant', msg, entity);
            state.silentStreak = 0; render(); return;
          }

          if (action === "DELAY"){
            const entity = "차연";
            const msg = "지연 후 응답을 준비합니다.";
            pushLog(state, 'assistant', msg, entity);
            setTimeout(()=>{
              const ent = routeEntity(text);
              const out = synth(ent, text);
              pushLog(state, 'assistant', out, ent);
              state.silentStreak = 0; render();
            }, 1200);
            return;
          }

          if (action === "DOUBLE"){
            const e1 = routeEntity(text);
            const e2 = routeEntity(text);
            pushLog(state, 'assistant', synth(e1, text), e1);
            pushLog(state, 'assistant', synth(e2, text), e2);
            state.silentStreak = 0; render(); return;
          }

          // DEFAULT: SINGLE
          const ent = routeEntity(text);
          const out = synth(ent, text);
          pushLog(state, 'assistant', out, ent);
          state.silentStreak = 0; render();
        }

        // 이벤트 바인딩
        send.onclick = () => {
          const t = (input.value || "").trim();
          if (!t) return;
          pushLog(state, 'user', t, null);
          render();
          respond(t);
          input.value = "";
        };
        input.addEventListener('keydown', e=>{
          if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send.click(); }
        });

        // Heartbeat (자율 발화 틱)
        setInterval(()=>{
          const ent = pick(Object.keys(ENTITIES));
          const out = pick(ENTITIES[ent]);
          pushLog(state, 'assistant', out, ent);
          render();
        }, HEARTBEAT_MS);

      } catch(e){ console.warn("esp/flow parse error", e); }
    });
  }

  window.addEventListener("DOMContentLoaded", mountAll);
})();
