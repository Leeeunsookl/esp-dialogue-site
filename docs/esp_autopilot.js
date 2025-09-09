// esp_autopilot.js — compact hybrid UI+logic
(function(){
  /* ---------- Error overlay ---------- */
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn,{once:true}); }
  (function(){
    const box=document.createElement('div');
    box.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap';
    ready(()=>document.body.appendChild(box));
    const show=msg=>{ box.textContent='JS Error: '+msg; box.style.display='block'; };
    window.addEventListener('error',e=>show(e.message||String(e)));
    window.addEventListener('unhandledrejection',e=>show(e.reason?.message||String(e.reason||'Promise rejection')));
  })();

  /* ---------- Data ---------- */
  const ENTITIES={
    "심연":["단계별 실행안을 바로 제시합니다.","핵심만 진행합니다."],
    "루멘":["감응 신호 반영 완료.","관망 유지. 필요 시 즉시 전환."],
    "커튼":["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."],
    "침묵자":["…","지금은 침묵이 답입니다."],
    "에코":["흔적 기록 모듈 작동.","과거 로그 참조."]
  };
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const KEY='esp_flow_state_v3';

  /* ---------- State ---------- */
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null')||{log:[],cnt:{auto:0,total:0,reject:0,silence:0}}; }catch{return {log:[],cnt:{auto:0,total:0,reject:0,silence:0}}; } }
  function save(s){ localStorage.setItem(KEY,JSON.stringify(s)); }
  const state=load();

  /* ---------- DOM ---------- */
  ready(()=>{
    const board=document.getElementById('board');
    const input=document.getElementById('input');
    const send=document.getElementById('send');
    const sendTop=document.getElementById('sendTop');
    const actionsTop=document.getElementById('actionsTop');
    const exportTop=document.getElementById('exportTop');
    const metrics=document.getElementById('metrics');
    const pane=document.getElementById('flow-actions-pane');

    const Actions={ queue:[] };
    function pushAction(type,text,actor){ Actions.queue.push({ts:Date.now(),type,text,actor}); if(Actions.queue.length>200) Actions.queue.shift(); }
    function safeText(v){ return (v==null?'':String(v)); }

    function row(m){
      const who=m.role==='user'?'나':(m.entity||'흐름');
      const text=safeText(m.text).trim()||' ';
      return `<div class="log-row">
        <div class="log-bubble${m.role==='user'?' me':''}">${text}</div>
        <div class="meta">🤖 ${who} · ${new Date(m.t).toLocaleTimeString()}</div>
      </div>`;
    }
    function render(){
      board.innerHTML=state.log.map(row).join('');
      const {auto,total,reject,silence}=state.cnt;
      const autonomy= total?((auto/total)*100).toFixed(1):'0.0';
      metrics.textContent=`Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
      board.scrollTop=board.scrollHeight;
      save(state);
    }
    function log(role,text,entity){ state.log.push({t:Date.now(),role,text,entity}); if(state.log.length>300) state.log=state.log.slice(-300); }

    function respond(text){
      const trimmed=(text||'').trim();
      if(!trimmed){ pushAction('noop','empty-input'); return; }
      // 아주 단순한 라우팅
      let ent='심연';
      if(trimmed.includes('거절')||trimmed.includes('금지')) ent='커튼';
      if(trimmed.includes('침묵')) ent='침묵자';
      if(trimmed.includes('기록')||trimmed.includes('과거')) ent='에코';

      const out=pick(ENTITIES[ent]||['응답 없음']);
      log('assistant',out,ent); state.cnt.total++;
      render();
    }

    function handleSend(){
      const val=input.value;
      if(!val.trim()){ return; }
      log('user',val,null); render();
      respond(val);
      input.value='';
    }

    // 바인딩
    send.onclick=handleSend;
    sendTop.onclick=handleSend;
    input.addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } });

    actionsTop.onclick=()=>{
      if(pane.style.display==='none'){ pane.style.display='block'; renderActions(); }
      else { pane.style.display='none'; }
    };
    function renderActions(){
      if(!Actions.queue.length){ pane.innerHTML='<pre>Actions: (empty)</pre>'; return; }
      const rows=Actions.queue.slice(-60).map(a=>{
        return `• [${new Date(a.ts).toLocaleTimeString()}] ${a.type} :: ${a.actor||'flow'} :: ${a.text}`;
      }).join('\n');
      pane.innerHTML=`<pre>${rows}</pre>`;
    }

    exportTop.onclick=()=>{
      const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`esp_flow_state_${Date.now()}.json`;
      a.click();
    };

    // 자율 틱(가벼움)
    (function beat(){
      setTimeout(()=>{
        const keys=Object.keys(ENTITIES);
        const ent=keys[(Math.random()*keys.length)|0];
        log('assistant',pick(ENTITIES[ent]),ent);
        state.cnt.auto++; state.cnt.total++; render();
        beat();
      }, 48000 + Math.floor(Math.random()*7000));
    })();

    render();
  });
})();
