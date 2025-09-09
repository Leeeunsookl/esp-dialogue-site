// esp_autopilot.js — Multi-selector safe binding + Actions + Export + Heartbeat
(function(){

  // --- DOM Ready 보장 ---
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }

  // --- 에러 오버레이 ---
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=>document.body.appendChild(box));
    const show = msg => { box.textContent = "JS Error: " + msg; box.style.display = "block"; };
    window.addEventListener("error", e => show(e.message || String(e)));
    window.addEventListener("unhandledrejection", e => show(e.reason?.message || String(e.reason||"Promise rejection")));
  })();

  // --- 응답 풀(샘플) ---
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

  // --- 상태 ---
  const KEY = "esp_flow_hybrid_state_v4";
  const MAX = 250;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)||"null") || def(); } catch { return def(); } };
  const save = s => localStorage.setItem(KEY, JSON.stringify(s));
  const def  = () => ({ log:[], actions:[], cnt:{auto:0,total:0,reject:0,silence:0} });
  const pushLog = (s,role,text,entity=null)=>{ s.log.push({t:Date.now(),role,text,entity}); if(s.log.length>MAX) s.log=s.log.slice(-MAX); };
  const pushAct = (s,type,text,actor="flow")=>{ s.actions.push({ts:Date.now(),type,text,actor}); if(s.actions.length>MAX) s.actions=s.actions.slice(-MAX); };

  // --- 부드러운 쿼리 ---
  const q = selList => { for(const sel of selList){ const el=document.querySelector(sel); if(el) return el; } return null; };

  // --- 메인 ---
  function boot(){
    const input     = q(["#flow-input","#input","textarea#input","textarea[data-role=input]"]);
    const logEl     = q(["#flow-log","#board",".flow-log"]);
    const btnSend   = q(["#flow-send","#send","button[data-role=send]"]);
    const btnGhost  = q(["#flow-send-ghost"]);
    const btnExport = q(["#flow-export","button[data-role=export]"]);
    const btnActs   = q(["#flow-actions","button[data-role=actions]"]);
    const metricsEl = q(["#flow-metrics","[data-role='metrics']"]);

    const state = load();

    function render(){
      if(logEl){
        logEl.innerHTML = state.log.map(m=>{
          const who = (m.role==='user') ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
          return `<div class="row ${m.role==='user'?'me':''}">
            <div class="msg">${m.text}</div>
            <div class="meta">${who} · ${tstr(m.t)}</div>
          </div>`;
        }).join("");
        logEl.scrollTop = logEl.scrollHeight;
      }
      if(metricsEl){
        const {auto,total,reject,silence} = state.cnt;
        const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
        metricsEl.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
      }
      save(state);
    }

    function respond(text){
      const ent = pick(ENT_KEYS);
      const out = pick(ENTITIES[ent] || ["응답 없음."]);
      pushLog(state,'assistant',out,ent);
      pushAct(state,'RESPOND',text,ent);
      state.cnt.total++;
      render();
    }

    function send(){
      const v = (input && typeof input.value==='string') ? input.value.trim() : "";
      if(!v) return;
      pushLog(state,'user',v,null);
      state.cnt.total++;
      render();
      respond(v);
      if(input){ input.value=""; input.dispatchEvent(new Event("input")); }
    }
    window.__esp_send = send; // 우회 호출 지원

    // 바인딩(존재하는 것만)
    btnSend  && btnSend.addEventListener("click", send, { passive:true });
    btnGhost && btnGhost.addEventListener("click", send, { passive:true });
    input && input.addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }
    });

    // Export (state + proof.json)
    btnExport && (btnExport.onclick = ()=>{
      const lastHash = state.log.length ? state.log[state.log.length-1].t : 0;
      const exportObj = { ...state, proof:{ lastHash, lastUpdated: Date.now() } };
      const blob = new Blob([JSON.stringify(exportObj,null,2)], { type:"application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `esp_flow_state_${Date.now()}.json`;
      a.click();

      // proof.json 별도
      const proof = { lastHash, lastUpdated: Date.now() };
      const b2 = new Blob([JSON.stringify(proof,null,2)], { type:"application/json" });
      const a2 = document.createElement("a");
      a2.href = URL.createObjectURL(b2);
      a2.download = `proof.json`;
      a2.click();
    });

    // Actions 미니 뷰
    btnActs && (btnActs.onclick = ()=>{
      const paneId = "flow-actions-pane";
      let pane = document.getElementById(paneId);
      if(!pane){
        pane = document.createElement("div");
        pane.id = paneId;
        pane.style.cssText = "position:fixed;right:10px;top:60px;z-index:50;width:min(92vw,420px);max-height:60vh;overflow:auto;background:#0d1218;border:1px solid #1a2028;border-radius:12px;padding:12px;color:#e8eef5";
        document.body.appendChild(pane);
      }
      const rows = state.actions.slice(-80).map(a=>{
        return `• [${tstr(a.ts)}] ${a.type} :: ${a.actor||"flow"} :: ${a.text}`;
      }).join("\n");
      pane.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <b>Actions</b> <button class="btn" onclick="this.parentNode.parentNode.remove()">닫기</button>
      </div><pre style="white-space:pre-wrap;margin:0">${rows||"(empty)"}</pre>`;
    });

    // 자율 Heartbeat
    const HEARTBEAT_MS = 45000, JITTER = 8000;
    (function beat(){
      setTimeout(()=>{
        const ent = pick(ENT_KEYS);
        const out = pick(ENTITIES[ent]);
        pushLog(state,'assistant',out,ent);
        state.cnt.auto++; state.cnt.total++; render();
        beat();
      }, HEARTBEAT_MS + Math.floor(Math.random()*JITTER));
    })();

    // 첫 렌더
    render();
  }

  ready(()=> boot());
})(); 
