// esp_autopilot.js — Minimal Mobile-first Flow Engine
(function () {
  const ENTITIES = {
    "심연": ["상태 확인 완료. 핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘": ["감응 신호 반영 완료.","구조적 흐름을 확인했습니다."],
    "침묵자": ["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼": ["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."],
    "에코": ["과거 로그를 참조합니다.","흔적 기록 모듈 작동."]
  };

  const KEY="esp_flow_hybrid_state_v3";
  const HEARTBEAT_MS=45000, JITTER=8000, MAX_LOG=250;

  // ---------- Utils ----------
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const time = t => new Date(t||Date.now()).toLocaleTimeString();
  const $    = sel => document.querySelector(sel);

  async function loadJSON(path, fallback){
    try{ const r=await fetch(path,{cache:"no-store"}); if(!r.ok) throw 0; return await r.json(); }
    catch{ return fallback; }
  }

  function loadState(){
    try{ return JSON.parse(localStorage.getItem(KEY)||"null") || def(); } catch{ return def(); }
    function def(){ return { log:[], lastKeywords:[], silentStreak:0, lastEntity:null, cnt:{auto:0,total:0,reject:0,silence:0}, self:null, unknowns:[], actions:[] }; }
  }
  function saveState(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  function pushLog(s, role, text, entity=null){
    s.log.push({ t:Date.now(), role, text, entity });
    if(s.log.length>MAX_LOG) s.log=s.log.slice(-MAX_LOG);
  }
  function pushAction(s, type, text, actor){
    s.actions.push({ ts:Date.now(), type, text, actor });
    if(s.actions.length>200) s.actions=s.actions.slice(-200);
  }
  function inc(s,k){ s.cnt[k]=(s.cnt[k]||0)+1; }

  // ---------- Boot ----------
  async function boot(){
    const routes = await loadJSON("/docs/routes.json", { rules:[], fallback:"심연" });
    const ethics = await loadJSON("/docs/ethics.json", { banned:["주민등록번호","여권번호","신용카드"], actions:{ on_banned:"REJECT", on_uncertain:"SILENCE" } });

    const state = loadState();
    // Self-model lazy init
    state.self = state.self || { identity:"flow", values:["투명성","안전","존중"], priorities:["명료성","증거"], taboo:["주민등록번호","여권번호","신용카드"], last_purpose:null };

    // ---- DOM refs (모바일 최적화된 단일 레이아웃) ----
    const logEl      = $("#flow-log");
    const input      = $("#flow-input");
    const sendTop    = $("#flow-send");
    const sendRight  = $("#flow-send-ghost");
    const btnExport  = $("#flow-export");
    const btnActions = $("#flow-actions");
    const metricsEl  = $("#metrics");
    const actionsPane= $("#actions-pane");

    // Autosize input
    input.addEventListener("input", ()=>{
      input.style.height="auto";
      input.style.height=Math.min(input.scrollHeight, window.innerHeight*0.4)+"px";
    }, {passive:true});

    // Renderers
    function render(){
      logEl.innerHTML = state.log.map(m=>{
        const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
        const bubble = `<div class="msg ${m.role==='user'?'me':''}">${m.text}</div><div class="meta">${who} · ${time(m.t)}</div>`;
        return `<div>${bubble}</div>`;
      }).join("");
      // scroll bottom
      logEl.scrollTop = logEl.scrollHeight;
      renderMetrics(); saveState(state);
    }
    function renderMetrics(){
      const { auto,total,reject,silence } = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      metricsEl.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }
    function renderActions(){
      if(!state.actions.length){ actionsPane.firstElementChild.textContent="Actions: (empty)"; return; }
      const rows = state.actions.slice(-60).map(a=>`• [${time(a.ts)}] ${a.type} :: ${a.actor||'flow'} :: ${a.text}`).join("\n");
      actionsPane.firstElementChild.textContent = rows;
    }

    // Routing / Ethics (간단)
    function detectKeywords(text){
      const found=[]; routes.rules.forEach(r=>r.kw.forEach(k=>{ if(text.includes(k)) found.push(k); })); return [...new Set(found)];
    }
    function routeEntity(text){
      for(const r of routes.rules){ if(r.kw.some(k=>text.includes(k))) return r.route; }
      return routes.fallback || "심연";
    }
    function ethicsDecide(text){
      if(ethics.banned.some(k=>text.includes(k))) return "REJECT";
      if(/실명|전화|주소|식별|민감/.test(text)) return "SILENCE";
      return "ALLOW";
    }

    // Meta gate
    function inferPurpose(text){
      if(/정리|요약|정돈/.test(text)) return "정리";
      if(/안전|위험|차단|금지/.test(text)) return "안전";
      if(/탐색|찾아|검색|조사/.test(text)) return "탐색";
      return state.self.last_purpose || "정리";
    }
    function assessClarity(text,purpose){
      if(!text || text.trim().length<2) return "vague";
      if(/충돌|모순/.test(text)) return "conflict";
      return purpose ? "clear" : "vague";
    }
    function metaWhy(text){
      const guard = ethicsDecide(text);
      if(guard==="REJECT")  return { act:"REJECT", why:"value_conflict" };
      if(guard==="SILENCE") return { act:"SILENCE", why:"uncertain_or_sensitive" };
      const p = inferPurpose(text); const c = assessClarity(text,p);
      if(c==="conflict") return { act:"REJECT", why:"purpose_conflict" };
      if(c==="vague")    return { act:"ASK", q: (state.lastEntity||"심연")==="루멘" ? "왜 이걸 하려는지 한 문장으로 알려줘." : "목적을 명확히 하라. 지금 무엇을 우선할 것인가?" };
      return { act:"CONTINUE", purpose:p };
    }

    // Decide (점수 간단화)
    function decideAction(text){
      const kws=detectKeywords(text);
      const score={SINGLE:2,DOUBLE:0,QUOTE: (state.log.length>4?1:0),DELAY:0,SILENCE:0,REJECT:0};
      if(kws.length>=2) score.DOUBLE+=2;
      if(state.lastKeywords.length && kws.some(k=>state.lastKeywords.includes(k))) score.DELAY+=1;
      state.lastKeywords = kws;
      return Object.entries(score).sort((a,b)=>b[1]-a[1])[0][0];
    }

    // Respond
    function respond(text){
      // Safety bootstrap
      state.self = state.self || { identity:"flow", values:["투명성","안전","존중"], priorities:["명료성","증거"], taboo:["주민등록번호","여권번호","신용카드"], last_purpose:null };

      const meta = metaWhy(text);
      if(meta.act==="REJECT"){
        pushLog(state,'assistant',"요청을 거절합니다.(윤리 가드: "+meta.why+")","커튼");
        inc(state,'reject'); inc(state,'total'); pushAction(state,"META","reject/"+meta.why,"커튼"); return render();
      }
      if(meta.act==="SILENCE"){
        pushLog(state,'assistant',"…(침묵 유지: "+meta.why+")","침묵자");
        inc(state,'silence'); inc(state,'total'); pushAction(state,"META","silence/"+meta.why,"침묵자"); return render();
      }
      if(meta.act==="ASK"){
        const ent = state.lastEntity || "심연";
        pushLog(state,'assistant', meta.q, ent);
        inc(state,'total'); pushAction(state,"META","ask-purpose",ent); return render();
      }
      state.self.last_purpose = meta.purpose;

      // Unknown harvesting
      try{
        const known = (routes.rules||[]).flatMap(r=>r.kw);
        const tokens = String(text||"").split(/\s+/).filter(Boolean);
        const nov = tokens.filter(tok=> !known.some(k=>tok.includes(k))).slice(0,5);
        if(nov.length) state.unknowns.push({t:Date.now(),items:nov});
      }catch{}

      // Action selection
      const act = decideAction(text);
      if(act==="QUOTE"){
        const past = [...state.log].reverse().find(m=>m.role==='assistant');
        pushLog(state,'assistant', past?`과거: "${past.text}"를 참조합니다.`:"과거 참조 없음.", "에코");
        inc(state,'total'); return render();
      }
      if(act==="DELAY"){
        pushLog(state,'assistant',"지연 후 응답을 준비합니다.","침묵자"); inc(state,'total'); render();
        return setTimeout(()=>{
          const e=routeEntity(text), out=pick(ENTITIES[e]||["응답 없음."]);
          pushLog(state,'assistant',out,e); inc(state,'total'); render();
        }, 800 + Math.random()*600);
      }
      if(act==="DOUBLE"){
        const e1=routeEntity(text), e2=routeEntity(text);
        pushLog(state,'assistant',pick(ENTITIES[e1]||["응답 없음."]),e1);
        pushLog(state,'assistant',pick(ENTITIES[e2]||["응답 없음."]),e2);
        inc(state,'total'); inc(state,'total'); return render();
      }
      // SINGLE
      const ent=routeEntity(text), out=pick(ENTITIES[ent]||["응답 없음."]);
      pushLog(state,'assistant',out,ent); inc(state,'total'); render();
    }

    // Events
    function send(){
      const t=(input.value||"").trim();
      if(!t) return;
      pushLog(state,'user',t,null); render(); respond(t); input.value=""; input.dispatchEvent(new Event("input"));
    }
    [sendTop, $("#flow-send-ghost")].forEach(btn=>btn.addEventListener("click", send));
    input.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }});
    btnExport.addEventListener("click", ()=>{
      const dump = JSON.stringify({ ...state }, null, 2);
      const a=document.createElement("a");
      a.href=URL.createObjectURL(new Blob([dump],{type:"application/json"}));
      a.download=`esp_flow_state_${Date.now()}.json`; a.click();
    });
    btnActions.addEventListener("click", ()=>{
      actionsPane.classList.toggle("hidden"); renderActions();
    });

    // Initial render
    render();

    // Heartbeat
    (function beat(){
      const delay=HEARTBEAT_MS+Math.floor(Math.random()*JITTER);
      setTimeout(()=>{ const e=pick(Object.keys(ENTITIES)); pushLog(state,'assistant',pick(ENTITIES[e]),e); inc(state,'auto'); inc(state,'total'); render(); beat(); }, delay);
    })();

  } // boot end

  window.addEventListener("DOMContentLoaded", boot, {once:true});
})();
