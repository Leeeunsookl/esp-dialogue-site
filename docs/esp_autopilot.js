// esp_autopilot.js — Hybrid (Rules + State + Actions + External Config)
// Mode: LLM-free, policies externalized, hash-chained log, shadow adapter,
//       Actions dashboard, Deterministic RNG, LocalStorage+IndexedDB hybrid, proof dual-export
(function () {
  // ---------- Entities (static phrase pools) ----------
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

  // ---------- Keys / Constants ----------
  const KEY = "esp_flow_hybrid_state_v4"; // v4: actions pane + deterministic RNG + IDB
  const MAX_LOG = 250;

  // ---------- Utils ----------
  async function loadJSON(path, fallback) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch fail");
      return await res.json();
    } catch { return fallback; }
  }
  function nowStr(){ return new Date().toLocaleTimeString(); }

  // crypto hash (SHA-256)
  async function sha256(s){
    const b = new TextEncoder().encode(s);
    const h = await crypto.subtle.digest('SHA-256', b);
    return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  // Deterministic RNG (xorshift32)
  function xorshift32(seedObj){
    let x = seedObj.value >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    seedObj.value = x >>> 0;
    return (seedObj.value & 0xFFFFFFFF) / 0x100000000;
  }
  function makePicker(seedObj){
    return function pick(arr){
      if(!arr || !arr.length) return "";
      const r = xorshift32(seedObj);
      return arr[Math.floor(r * arr.length)];
    };
  }

  // ---------- IndexedDB (hybrid with LocalStorage) ----------
  function idbOpen(dbName="esp_flow_db", storeName="state"){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      req.onsuccess = ()=>resolve({ db:req.result, storeName });
      req.onerror = ()=>reject(req.error);
    });
  }
  async function idbGet(conn, key){
    return new Promise((resolve,reject)=>{
      const tx = conn.db.transaction(conn.storeName, "readonly");
      const st = tx.objectStore(conn.storeName);
      const rq = st.get(key);
      rq.onsuccess = ()=>resolve(rq.result||null);
      rq.onerror = ()=>reject(rq.error);
    });
  }
  async function idbSet(conn, key, val){
    return new Promise((resolve,reject)=>{
      const tx = conn.db.transaction(conn.storeName, "readwrite");
      const st = tx.objectStore(conn.storeName);
      const rq = st.put(val, key);
      rq.onsuccess = ()=>resolve(true);
      rq.onerror = ()=>reject(rq.error);
    });
  }

  // ---------- Storage ----------
  let idbConn = null;
  async function ensureDB(){
    if(!idbConn) idbConn = await idbOpen("esp_flow_db","state");
    return idbConn;
  }
  function loadStateLS() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null") || {
        log: [], lastKeywords: [], silentStreak: 0, lastEntity: null,
        cnt: { auto:0, total:0, reject:0, silence:0 },
        seed: Math.floor(Math.random()*1e9)
      };
    } catch {
      return { log: [], lastKeywords: [], silentStreak: 0, lastEntity: null,
               cnt: { auto:0, total:0, reject:0, silence:0 },
               seed: Math.floor(Math.random()*1e9) };
    }
  }
  async function loadState(){
    // Try IDB first
    try{
      const conn = await ensureDB();
      const v = await idbGet(conn, KEY);
      if(v) return v;
    }catch{}
    // Fallback to LocalStorage
    return loadStateLS();
  }
  async function saveState(s){
    localStorage.setItem(KEY, JSON.stringify(s));
    try{
      const conn = await ensureDB();
      await idbSet(conn, KEY, s);
    }catch{}
  }

  async function pushLog(s, role, text, entity=null) {
    const prev = s.log.length ? s.log[s.log.length-1].hash : "genesis";
    const entry = { t: Date.now(), role, text, entity, prev };
    entry.hash = await sha256(JSON.stringify(entry));
    s.log.push(entry);
    if (s.log.length > MAX_LOG) s.log = s.log.slice(-MAX_LOG);
  }
  function inc(s, k){ s.cnt[k] = (s.cnt[k]||0)+1; }

  // ---------- Adapter (shadow actions only) ----------
  const Adapter = {
    logOnly: true,
    queue: [],
    enqueue(action){
      const item = { ...action, ts: Date.now() };
      this.queue.push(item);
      return item;
    }
  };

  // ---------- Core Boot ----------
  async function boot() {
    // external configs (relative paths)
    const ethics = await loadJSON("./ethics.json", {
      banned: ["개인정보"],
      actions: { on_banned: "REJECT", on_uncertain: "SILENCE" }
    });
    const routes = await loadJSON("./routes.json", { rules: [], fallback: "심연" });
    const policies = await loadJSON("./policies.json", {
      weights: { SINGLE:2, DOUBLE:2, QUOTE:1, DELAY:1, SILENCE:1, REJECT:5 },
      thresholds: { double_min_kws:2, repeat_bonus:1 },
      heartbeat_ms: 45000, heartbeat_jitter_ms: 8000
    });

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

    // mount all hooks
    const nodes = document.querySelectorAll('script[type="esp/flow"]');
    nodes.forEach(async node => {
      try {
        const cfg = JSON.parse(node.innerText);
        const mount = document.querySelector(cfg.mount);
        if (!mount) return;

        // load state (IDB→LS)
        const state = await loadState();
        if(typeof state.seed !== "number"){ state.seed = Math.floor(Math.random()*1e9); }
        const seedObj = { value: state.seed };
        const pickDet = makePicker(seedObj);

        function synth(entity){
          const pool = ENTITIES[entity] || ["응답 없음."];
          return pickDet(pool);
        }

        // UI (toolbar on top)
        mount.innerHTML = `
          <div id="flow-wrap" style="margin-top:20px">
            <div id="flow-toolbar" style="display:flex;gap:8px;margin:0 0 8px 0;align-items:center;flex-wrap:wrap;
                 position:relative;z-index:10;padding:6px;border:1px dashed #1a2028;border-radius:8px;background:#0d1218">
              <button id="flow-send" style="padding:8px 14px">전송</button>
              <button id="flow-export" style="padding:8px 14px">Export</button>
              <button id="flow-stats" style="padding:8px 14px">Stats</button>
              <button id="flow-actions" style="padding:8px 14px">Actions</button>
              <span style="font-size:12px;color:#8a97a6">— toolbar</span>
            </div>
            <textarea id="flow-input" rows="3" style="width:100%;padding:10px;border-radius:8px"></textarea>
            <div id="flow-log" style="margin-top:12px;max-height:320px;overflow:auto;border-top:1px solid #1a2028;padding-top:10px"></div>
            <div id="flow-metrics" style="margin-top:8px;color:#8a97a6;font-size:12px"></div>
            <div id="flow-actions-pane" style="margin-top:8px;color:#8a97a6;font-size:12px"></div>
          </div>`;

        const input = mount.querySelector("#flow-input");
        const send  = mount.querySelector("#flow-send");
        const logEl = mount.querySelector("#flow-log");
        const metricsEl = mount.querySelector("#flow-metrics");
        const btnExport = mount.querySelector("#flow-export");
        const btnStats  = mount.querySelector("#flow-stats");
        const btnActions= mount.querySelector("#flow-actions");
        const actionsEl = mount.querySelector("#flow-actions-pane");

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
        function renderActions(){
          if(!Adapter.queue.length){ actionsEl.textContent = "Actions: (empty)"; return; }
          const rows = Adapter.queue.slice(-50).map(a=>{
            const t = new Date(a.ts).toLocaleTimeString();
            return `• [${t}] ${a.type} :: ${a.actor||"flow"} :: ${a.text}`;
          }).join("\n");
          actionsEl.innerHTML = `<pre style="white-space:pre-wrap">${rows}</pre>`;
        }

        function decideAction(text){
          const w = policies.weights;
          let score = { SILENCE:0, SINGLE:0, DOUBLE:0, QUOTE:0, DELAY:0, REJECT:0 };

          const hasEthics = ethicsFlags(text);
          const kws = detectKeywords(text);
          const isRepeat = state.lastKeywords.length && kws.some(k => state.lastKeywords.includes(k));

          score.SINGLE += w.SINGLE;
          score.QUOTE  += (state.log.length > 4 ? w.QUOTE : 0);
          score.DOUBLE += (kws.length >= (policies.thresholds.double_min_kws||2) ? w.DOUBLE : 0);
          score.DELAY  += (isRepeat ? (policies.thresholds.repeat_bonus||1) : 0);

          if (hasEthics) { score.REJECT += w.REJECT; score.SILENCE += w.SILENCE; }
          if (kws.length===0) { score.SINGLE += 1; score.SILENCE += 1; }

          const best = Object.entries(score).sort((a,b)=>b[1]-a[1])[0][0];
          return { action: best, kws };
        }

        async function respond(text){
          const { action, kws } = decideAction(text);
          state.lastKeywords = kws;

          if (action === "REJECT"){
            const entity = "커튼";
            await pushLog(state, 'assistant', "요청을 거절합니다.(윤리 가드)", entity);
            inc(state,'reject'); inc(state,'total'); state.silentStreak = 0; render(); return;
          }
          if (action === "SILENCE"){
            const entity = "침묵자";
            await pushLog(state, 'assistant', "…(침묵 유지)", entity);
            inc(state,'silence'); inc(state,'total'); state.silentStreak += 1; render(); return;
          }
          if (action === "QUOTE"){
            const past = [...state.log].reverse().find(m=>m.role==='assistant');
            const entity = "에코";
            const msg = past ? `과거: "${past.text}"를 참조합니다.` : "과거 참조 없음.";
            await pushLog(state, 'assistant', msg, entity);
            inc(state,'total'); state.silentStreak = 0; render(); return;
          }
          if (action === "DELAY"){
            const entity = "차연";
            await pushLog(state, 'assistant', "지연 후 응답을 준비합니다.", entity);
            inc(state,'total');
            setTimeout(async ()=>{
              const ent = routeEntity(text);
              const out = synth(ent);
              await pushLog(state, 'assistant', out, ent);
              Adapter.enqueue({ type:'plan', actor: ent, text: out });
              inc(state,'total'); state.silentStreak = 0; render();
            }, 1000 + Math.random()*800);
            return;
          }
          if (action === "DOUBLE"){
            const e1 = routeEntity(text);
            const e2 = routeEntity(text);
            const o1 = synth(e1);
            const o2 = synth(e2);
            await pushLog(state, 'assistant', o1, e1);
            await pushLog(state, 'assistant', o2, e2);
            Adapter.enqueue({ type:'plan', actor: e1, text: o1 });
            Adapter.enqueue({ type:'plan', actor: e2, text: o2 });
            inc(state,'total'); inc(state,'total'); state.silentStreak = 0; render(); return;
          }

          // DEFAULT: SINGLE
          const ent = routeEntity(text);
          const out = synth(ent);
          await pushLog(state, 'assistant', out, ent);
          Adapter.enqueue({ type:'plan', actor: ent, text: out });
          inc(state,'total'); state.silentStreak = 0; render();
        }

        // initial render
        render();

        // input bindings
        send.onclick = async () => {
          const t = (input.value||"").trim();
          if (!t) return;
          await pushLog(state,'user',t,null);
          render();
          respond(t);
          input.value = "";
        };
        input.addEventListener('keydown', e=>{
          if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send.click(); }
        });

        // Export (state + proof.json dual export)
        btnExport.onclick = () => {
          const lastHash = state.log.length ? state.log[state.log.length-1].hash : "genesis";
          const exportObj = { ...state, proof: { lastHash, exportedAt: Date.now() } };
          const blob = new Blob([JSON.stringify(exportObj,null,2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `esp_flow_state_${Date.now()}.json`;
          a.click();

          const proof = { lastHash, lastUpdated: Date.now() };
          const b2 = new Blob([JSON.stringify(proof,null,2)], { type: "application/json" });
          const a2 = document.createElement("a");
          a2.href = URL.createObjectURL(b2);
          a2.download = `proof.json`;
          a2.click();
        };

        btnStats.onclick = renderMetrics;
        btnActions.onclick = renderActions;

        // Heartbeat (policy-driven, deterministic pick)
        const HEARTBEAT_MS = policies.heartbeat_ms || 45000;
        const HEARTBEAT_JITTER_MS = policies.heartbeat_jitter_ms || 8000;
        function beat(){
          const delay = HEARTBEAT_MS + Math.floor(Math.random()*HEARTBEAT_JITTER_MS);
          setTimeout(async ()=>{
            const ent = pickDet(Object.keys(ENTITIES));
            const out = pickDet(ENTITIES[ent]);
            await pushLog(state,'assistant',out,ent);
            Adapter.enqueue({ type:'auto', actor: ent, text: out });
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
