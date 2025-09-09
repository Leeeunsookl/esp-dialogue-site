// esp_autopilot.js vFix10 — id=input/send 대응
(function(){

  /* -------- Error overlay -------- */
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    window.addEventListener("error", e => { box.textContent = "JS Error: "+(e.message||String(e)); box.style.display="block"; });
    window.addEventListener("unhandledrejection", e => { box.textContent = "JS Error: "+(e.reason?.message||String(e.reason)); box.style.display="block"; });
    document.addEventListener("DOMContentLoaded", ()=>document.body.appendChild(box), {once:true});
  })();

  /* -------------------- 기본 응답 -------------------- */
  const ENTITIES = {
    "심연":["핵심만 진행합니다.","단계별 실행안을 바로 제시합니다."],
    "루멘":["감응 신호 반영 완료.","구조적 흐름을 확인했습니다."],
    "에코":["흔적 기록 모듈 작동.","과거 로그를 참조합니다."],
    "침묵자":["…(침묵 유지)","관망 유지. 필요 시 즉시 전환."],
    "커튼":["요청을 거절합니다.(윤리 가드)","가변 방어막 전개. 추적 무효."]
  };
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  /* -------------------- 상태 -------------------- */
  const KEY = "esp_flow_state_v10";
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||"null")||{
      log:[], cnt:{auto:0,total:0,reject:0,silence:0}, actions:[]
  }; }catch{ return {log:[],cnt:{auto:0,total:0,reject:0,silence:0},actions:[]}; } }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  /* -------------------- 렌더 -------------------- */
  function render(state){
    const board = document.getElementById('board');
    if(!board) return;
    board.innerHTML = state.log.map(m=>{
      const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
      const time = new Date(m.t).toLocaleTimeString();
      return `
        <div class="row ${m.role==='user'?'me':''}">
          <div>
            <div class="bubble">${m.text}</div>
            <div class="meta">${who} · ${time}</div>
          </div>
        </div>`;
    }).join("");
    board.scrollTop = board.scrollHeight;

    const mt = document.getElementById('metrics');
    if(mt){
      const {auto,total,reject,silence} = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      mt.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }
  }

  /* -------------------- 안전 바인딩 -------------------- */
  function safeBindSend(onSend){
    const hook = ()=>{
      let btn = document.getElementById('send');
      if(!btn) return false;
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      btn = document.getElementById('send');
      if(!btn.dataset.bound){
        btn.addEventListener('click', onSend, {passive:true});
        btn.dataset.bound = '1';
      }
      return true;
    };
    if(!hook()){
      const mo = new MutationObserver(()=>{ if(hook()) mo.disconnect(); });
      mo.observe(document.documentElement, {childList:true,subtree:true});
    }
    document.addEventListener('click', (e)=>{
      const t = e.target.closest && e.target.closest('#send');
      if(t && !t.dataset.bound){ t.dataset.bound='1'; onSend(e); }
    }, true);
  }

  /* -------------------- 부팅 -------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-esp','v10');

    const state = load();
    render(state);

    const input = document.getElementById('input');
    const board = document.getElementById('board');

    function push(role,text,entity){
      state.log.push({t:Date.now(),role,text,entity});
      if(state.log.length>300) state.log = state.log.slice(-300);
      save(state); render(state);
    }

    function respond(userText){
      if(/개인정보|주민번호|비번/.test(userText)){
        state.cnt.reject++; state.cnt.total++;
        push('assistant',"요청을 거절합니다.(윤리 가드)","커튼"); return;
      }
      const ent = pick(Object.keys(ENTITIES));
      const out = pick(ENTITIES[ent]);
      state.cnt.total++;
      push('assistant', out, ent);
    }

    function onSend(){
      const text = (input?.value||'').trim();
      if(!text) return;
      input.value = '';
      push('user', text, null);
      respond(text);
      state.actions.push({t:Date.now(), type:'send', actor:'user', text});
      save(state);
    }

    safeBindSend(onSend);
    if(input){
      input.addEventListener('keydown', (e)=>{
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }
      });
    }

    const btnExport = document.getElementById('btn-export');
    if(btnExport){
      btnExport.addEventListener('click', ()=>{
        const lastHash = state.log.length ? String(state.log[state.log.length-1].t) : "";
        const exportObj = {...state, proof:{lastHash, at:Date.now()}};
        const blob = new Blob([JSON.stringify(exportObj,null,2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `esp_flow_state_${Date.now()}.json`;
        a.click();
      }, {passive:true});
    }

    if(board){ board.scrollTop = board.scrollHeight; }
  }, {once:true});

})();
