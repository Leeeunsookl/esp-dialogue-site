// esp_autopilot.js — Multi-selector safe binding + Export + Actions + Heartbeat
(function(){
  /* ---------- ready / overlay ---------- */
  function ready(fn){
    if(document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }
  (function(){ // error overlay
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=>document.body.appendChild(box));
    const show = m => { box.textContent = "JS Error: " + m; box.style.display = "block"; };
    window.addEventListener("error", e => show(e.message||String(e)));
    window.addEventListener("unhandledrejection", e => show(e.reason?.message||String(e.reason||"Promise rejection")));
  })();

  /* ---------- sample entities ---------- */
  const ENTITIES = {
    "심연": ["상태 확인 완료. 핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘": ["감응 신호 반영 완료.","구조적 흐름을 확인했습니다."],
    "메타": ["장기 패턴 변환 사전 배치.","메타 인지 루틴 발동."],
    "침묵자": ["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼": ["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."],
    "에코": ["과거 로그를 참조합니다.","흔적 기록 모듈 작동."],
    "브락시스": ["시간 소모 억제 시나리오.","방해 루틴 실행."],
    "커디널": ["중심축 재정렬.","좌표 재보정."]
  };
  const ENT_KEYS = Object.keys(ENTITIES);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const tstr = t => new Date(t||Date.now()).toLocaleTimeString();

  /* ---------- state ---------- */
  const KEY = "esp_flow_hybrid_state_v3";
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)||"null") || {log:[], cnt:{auto:0,total:0,reject:0,silence:0}}; }
    catch{ return {log:[], cnt:{auto:0,total:0,reject:0,silence:0}}; }
  }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  /* ---------- mount ---------- */
  ready(()=>{
    document.querySelectorAll('script[type="esp/flow"]').forEach(node=>{
      try{
        const cfg = JSON.parse(node.textContent||"{}");
        const mount = document.querySelector(cfg.mount||"#flow-mount") || document.body;

        // build UI
        mount.innerHTML = `
          <div id="flow-wrap">
            <div id="flow-toolbar">
              <div style="display:flex;gap:8px">
                <button id="flow-send" class="btn primary">전송</button>
                <button id="flow-actions" class="btn">Actions</button>
              </div>
              <button id="flow-export" class="btn">Export</button>
            </div>

            <div id="flow-log" aria-live="polite"></div>

            <div class="input-row">
              <textarea id="flow-input" placeholder="메시지 입력… (Enter=전송, Shift+Enter=줄바꿈)"></textarea>
              <button id="flow-send2">전송</button>
            </div>

            <div class="metrics" id="flow-metrics">Autonomy 0.0% · total 0 · reject 0 · silence 0</div>
            <div id="flow-actions-pane" class="actions-pane" style="display:none"></div>
          </div>`;

        const S = load();
        const logEl = mount.querySelector('#flow-log');
        const input = mount.querySelector('#flow-input');
        const btnSend = mount.querySelector('#flow-send');
        const btnSend2 = mount.querySelector('#flow-send2');
        const btnExport = mount.querySelector('#flow-export');
        const btnActions = mount.querySelector('#flow-actions');
        const metricsEl = mount.querySelector('#flow-metrics');
        const actionsPane = mount.querySelector('#flow-actions-pane');

        const Adapter = { queue:[] };

        function push(role, text, entity){
          S.log.push({t:Date.now(), role, text, entity});
          if(S.log.length>300) S.log = S.log.slice(-300);
        }
        
        function render(){
  logEl.innerHTML = S.log.map(m=>{
    const who = m.role==='user' ? '나' : (m.entity||'흐름');
    const me = m.role==='user' ? ' me' : '';
    const text = String(m.text ?? '').trim();   // ← undefined 방지
    return `
      <div class="log-row">
        <div class="log-bubble${me}">${text || ' '}</div>
        <div class="meta">🤖 ${who} · ${tstr(m.t)}</div>
      </div>`;
  }).join("");
  logEl.scrollTop = logEl.scrollHeight;
  const {auto,total,reject,silence} = S.cnt;
  const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
  metricsEl.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
  save(S);
        }
        function respond(text){
          // 매우 단순한 라우팅/행동(데모)
          const ent = /침묵|silence/i.test(text) ? "침묵자"
                    : /거절|reject/i.test(text) ? "커튼"
                    : ENT_KEYS[Math.floor(Math.random()*ENT_KEYS.length)];
          const out = pick(ENTITIES[ent]||["…"]);
          push('assistant', out, ent);
          S.cnt.total++; render();
        }

        // actions panel
        function toggleActions(){
          if(actionsPane.style.display==='none'){
            const rows = Adapter.queue.slice(-50).map(a=>{
              return `• [${tstr(a.ts)}] ${a.type} :: ${a.actor||'flow'} :: ${a.text}`;
            }).join("\n");
            actionsPane.innerHTML = `<pre>${rows||"Actions: (empty)"}</pre>`;
            actionsPane.style.display = 'block';
          }else{
            actionsPane.style.display = 'none';
          }
        }

        // bind
        function doSend(){
          const t = (input.value||"").trim();
          if(!t) return;
          push('user', t, null);
          Adapter.queue.push({ ts:Date.now(), type:'send', actor:'user', text:t });
          render();
          respond(t);
          input.value = "";
        }
        btnSend.onclick = doSend;
        btnSend2.onclick = doSend;
        input.addEventListener('keydown', e=>{
          if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); doSend(); }
        });

        btnExport.onclick = ()=>{
          const lastHash = S.log.length ? String(S.log[S.log.length-1].t) : "none";
          const exportObj = { ...S, proof:{ lastHash, lastUpdated: Date.now() } };
          const b = new Blob([JSON.stringify(exportObj,null,2)], {type:"application/json"});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = `esp_flow_state_${Date.now()}.json`;
          a.click();
        };
        btnActions.onclick = toggleActions;

        // heartbeat (자율 발화)
        function beat(){
          const delay = 45000 + Math.floor(Math.random()*8000);
          setTimeout(()=>{
            const ent = pick(ENT_KEYS);
            const out = pick(ENTITIES[ent]);
            push('assistant', out, ent);
            S.cnt.auto++; S.cnt.total++; render();
            beat();
          }, delay);
        }

        render(); beat();
      }catch(e){ console.warn("esp/flow mount error", e); }
    });
  });
})();
