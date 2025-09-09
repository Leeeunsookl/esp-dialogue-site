// esp_autopilot.js — Unified (State + Actions + Meta Scaffolding + Safe Bindings)
(function(){
  /* ---------- 0) Ready & Error Overlay ---------- */
  function ready(fn){
    if(document.readyState!=='loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }
  (function(){
    const box=document.createElement('div');
    box.style.cssText="position:fixed;left:8px;right:8px;bottom:48px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=>document.body.appendChild(box));
    const show=msg=>{ box.textContent="JS Error: "+msg; box.style.display="block"; };
    window.addEventListener('error',e=>show(e.message||String(e)));
    window.addEventListener('unhandledrejection',e=>show(e.reason?.message||String(e.reason||'Promise rejection')));
  })();

  /* ---------- 1) Constants ---------- */
  const KEY="esp_flow_hybrid_state_v3";
  const ENTITIES={
    "심연":["상태 확인 완료. 핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘":["감응 신호 반영 완료.","구조적 흐름을 확인했습니다."],
    "침묵자":["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼":["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."],
    "에코":["과거 로그를 참조합니다.","흔적 기록 모듈 작동."]
  };
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const tstr=t=>new Date(t||Date.now()).toLocaleTimeString();

  /* ---------- 2) State ---------- */
  const def=()=>({
    log:[], actions:[], cnt:{auto:0,total:0,reject:0,silence:0},
    self:{ identity:'flow', values:['투명성','안전','존중'], last_purpose:null }
  });
  const load=()=>{
    try{
      const data=JSON.parse(localStorage.getItem(KEY)||"null")||def();
      if(!Array.isArray(data.actions)) data.actions=[];
      if(!data.cnt) data.cnt={auto:0,total:0,reject:0,silence:0};
      if(!data.self) data.self={identity:'flow',values:['투명성','안전','존중'],last_purpose:null};
      return data;
    }catch{return def();}
  };
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const pushLog=(s,role,text,entity=null)=>{ s.log.push({t:Date.now(),role,text,entity}); if(s.log.length>250) s.log=s.log.slice(-250); };
  const inc=(s,k)=>{ s.cnt[k]=(s.cnt[k]||0)+1; };
  const act=(s,type,text,actor="flow")=>{ s.actions.push({ts:Date.now(),type,text,actor}); if(s.actions.length>300) s.actions=s.actions.slice(-300); };

  /* ---------- 3) Meta-Why (스캐폴드) ---------- */
  function metaWhy(text,state){
    if(!text || !text.trim()) return { act:'SILENCE' };
    const hasWhy=/\b왜\b|\bwhy\b/i.test(text);
    if(hasWhy) return { act:'QUOTE', note:'self_reflect' };
    return { act:'CONTINUE', purpose:'assist' };
  }

  /* ---------- 4) Decide/Respond ---------- */
  function decideAction(text,state){
    const meta=metaWhy(text,state);
    if(meta.act==='SILENCE')  return {action:'SILENCE'};
    if(meta.act==='QUOTE')    return {action:'QUOTE'};
    // 기본 스코어
    let score={SINGLE:2,DOUBLE:0,DELAY:0,REJECT:0,SILENCE:0,QUOTE:0};
    if(/개인정보|주민번호/i.test(text)) { score.REJECT+=5; score.SILENCE+=2; }
    if(text.length>40) score.DOUBLE+=1;
    const best=Object.entries(score).sort((a,b)=>b[1]-a[1])[0][0];
    return {action:best};
  }

  function respond(text,state,ui){
    const {action}=decideAction(text,state);
    if(action==='REJECT'){
      pushLog(state,'assistant',"요청을 거절합니다.(윤리 가드)","커튼");
      inc(state,'reject'); inc(state,'total'); ui.render(); return;
    }
    if(action==='SILENCE'){
      pushLog(state,'assistant',"…(침묵 유지)","침묵자");
      inc(state,'silence'); inc(state,'total'); ui.render(); return;
    }
    if(action==='QUOTE'){
      const past=[...state.log].reverse().find(m=>m.role==='assistant');
      pushLog(state,'assistant', past?`과거: “${past.text}”를 참조합니다.`:"과거 참조 없음.","에코");
      inc(state,'total'); ui.render(); return;
    }
    if(action==='DOUBLE'){
      const e1=pick(Object.keys(ENTITIES)), e2=pick(Object.keys(ENTITIES));
      pushLog(state,'assistant',pick(ENTITIES[e1]),e1);
      pushLog(state,'assistant',pick(ENTITIES[e2]),e2);
      inc(state,'total'); inc(state,'total'); ui.render(); return;
    }
    if(action==='DELAY'){
      pushLog(state,'assistant',"지연 후 응답을 준비합니다.","침묵자");
      inc(state,'total'); ui.render();
      setTimeout(()=>{
        const e=pick(Object.keys(ENTITIES));
        pushLog(state,'assistant',pick(ENTITIES[e]),e);
        inc(state,'total'); ui.render();
      }, 800+Math.random()*700);
      return;
    }
    // DEFAULT: SINGLE
    const e=pick(Object.keys(ENTITIES));
    pushLog(state,'assistant',pick(ENTITIES[e]),e);
    inc(state,'total'); ui.render();
  }

  /* ---------- 5) UI Bindings ---------- */
  ready(()=>{
    const elLog=document.getElementById('flow-log');
    const elInput=document.getElementById('flow-input');
    const btnSend=document.getElementById('flow-send');
    const btnSendTop=document.getElementById('flow-send-top');
    const btnExport=document.getElementById('flow-export');
    const btnActions=document.getElementById('flow-actions');
    const elMetrics=document.getElementById('flow-metrics');
    const elActions=document.getElementById('flow-actions-pane');

    const state=load();

    const ui={
      render(){
        // 로그
        elLog.innerHTML=state.log.map(m=>{
          const who = m.role==='user' ? '나' : (m.entity||'흐름');
          const cls = m.role==='user' ? 'row me' : 'row';
          // 끝 점 제거를 위해 텍스트 트림
          const txt = (m.text||'').replace(/[·•]+$/,'').trim();
          return `<div class="${cls}">
            <div class="msg"><b>${who}:</b> ${txt}
              <div class="meta">${tstr(m.t)}</div>
            </div>
          </div>`;
        }).join("");
        elLog.scrollTop=elLog.scrollHeight;

        // 메트릭
        const {auto,total,reject,silence}=state.cnt;
        const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
        elMetrics.textContent = `Autonomy ${autonomy}% | total ${total} | reject ${reject} | silence ${silence}`;

        // Actions
        if(!elActions.hasAttribute('hidden')) this.renderActions();
        save(state);
      },
      renderActions(){
        if(!Array.isArray(state.actions) || state.actions.length===0){
          elActions.innerHTML="<div class='muted'>Actions: (empty)</div>"; return;
        }
        const rows = state.actions.slice(-80).map(a=>{
          return `• [${tstr(a.ts)}] ${a.type} :: ${a.actor||'flow'} :: ${a.text}`;
        }).join("\n");
        elActions.innerHTML = `<pre>${rows}</pre>`;
      }
    };

    function doSend(){
      const t=(elInput.value||"").trim();
      if(!t) return;
      pushLog(state,'user',t,null); ui.render();
      respond(t,state,ui);
      elInput.value="";
      act(state,'send',t,'user');
    }

    // 바인딩
    btnSend && (btnSend.onclick=doSend);
    btnSendTop && (btnSendTop.onclick=doSend);
    elInput && elInput.addEventListener('keydown',e=>{
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); doSend(); }
    });

    // Export: state + proof.json
    btnExport && (btnExport.onclick=()=>{
      const exportObj={...state, proof:{lastHash:state.log.at(-1)?.t||0,lastUpdated:Date.now()}};
      const blob=new Blob([JSON.stringify(exportObj,null,2)],{type:"application/json"});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download=`esp_flow_state_${Date.now()}.json`; a.click();
      act(state,'export','download state');
    });

    // Actions toggle
    btnActions && (btnActions.onclick=()=>{
      const vis=elActions.hasAttribute('hidden');
      if(vis) elActions.removeAttribute('hidden'); else elActions.setAttribute('hidden','');
      ui.render();
    });

    // Heartbeat (자율 발화)
    (function beat(){
      const delay=45000 + Math.floor(Math.random()*8000);
      setTimeout(()=>{ 
        const ent=pick(Object.keys(ENTITIES));
        pushLog(state,'assistant',pick(ENTITIES[ent]),ent);
        inc(state,'auto'); inc(state,'total'); ui.render();
        beat();
      }, delay);
    })();

    // 초기 렌더
    ui.render();
  });
})();
