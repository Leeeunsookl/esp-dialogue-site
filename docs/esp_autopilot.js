// esp_autopilot.js — hard-bind minimal chat + self-diagnose
(function () {
  /* 0) 아주 작은 진단 배지: 로드만 되면 화면 오른쪽 아래 "JS:v12" 점등 */
  (function () {
    const b = document.createElement('div');
    b.textContent = 'JS:v12';
    Object.assign(b.style, {
      position: 'fixed', right: '8px', bottom: '8px', zIndex: 9998,
      font: '11px/1 system-ui', color: '#0b1', background: '#041',
      padding: '2px 6px', borderRadius: '6px', opacity: '0.8'
    });
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(b), { once: true });
  })();

  /* 1) 에러 오버레이 */
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:28px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    window.addEventListener("error", e => { box.textContent = "JS Error: "+(e.message||String(e)); box.style.display="block"; });
    window.addEventListener("unhandledrejection", e => { box.textContent = "JS Error: "+(e.reason?.message||String(e.reason)); box.style.display="block"; });
    document.addEventListener("DOMContentLoaded", ()=>document.body.appendChild(box), {once:true});
  })();

  /* 2) 상태 */
  const KEY = "esp_flow_state_v12";
  const ENT = {
    "심연": ["핵심만 진행합니다.", "단계별 실행안을 바로 제시합니다."],
    "루멘": ["감응 신호 반영 완료.", "구조적 흐름을 확인했습니다."],
    "에코": ["흔적 기록 모듈 작동.", "과거 로그를 참조합니다."],
    "침묵자": ["…(침묵 유지)", "관망 유지. 필요 시 즉시 전환."],
    "커튼": ["요청을 거절합니다.(윤리 가드)", "가변 방어막 전개. 추적 무효."]
  };
  const pick = a => a[Math.floor(Math.random()*a.length)];
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||"null")||{log:[],cnt:{auto:0,total:0,reject:0,silence:0}};}catch{return {log:[],cnt:{auto:0,total:0,reject:0,silence:0}};}
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  function render(state){
    const board = document.getElementById('board');
    if(board){
      board.innerHTML = state.log.map(m=>{
        const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
        const time = new Date(m.t).toLocaleTimeString();
        return `<div class="row ${m.role==='user'?'me':''}">
          <div><div class="bubble">${m.text}</div><div class="meta">${who} · ${time}</div></div>
        </div>`;
      }).join('');
      board.scrollTop = board.scrollHeight;
    }
    const mt = document.getElementById('metrics');
    if(mt){
      const {auto,total,reject,silence} = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      mt.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }
  }

  function boot(){
    const state = load();
    render(state);

    const input = document.getElementById('input');
    const origSend = document.getElementById('send');

    // 필수 요소 확인
    if(!input || !origSend){ return setTimeout(boot, 200); }

    // 버튼 복제: 이벤트 및 오염 제거
    const send = origSend.cloneNode(true);
    send.id = 'send'; // ID 유지
    origSend.replaceWith(send);

    function push(role,text,entity){
      state.log.push({t:Date.now(), role, text, entity});
      if(state.log.length>300) state.log = state.log.slice(-300);
      save(state); render(state);
    }

    function respond(userText){
      if(/개인정보|주민번호|비번/.test(userText)){
        state.cnt.reject++; state.cnt.total++;
        push('assistant',"요청을 거절합니다.(윤리 가드)","커튼"); return;
      }
      const ent = pick(Object.keys(ENT));
      const out = pick(ENT[ent]);
      state.cnt.total++;
      push('assistant', out, ent);
    }

    function onSend(){
      const txt = (input.value||'').trim();
      if(!txt) return;
      input.value = '';
      push('user', txt, null);
      respond(txt);
    }

    // 이벤트 바인딩 (3중 방어)
    send.addEventListener('click', onSend, {passive:true});
    send.onclick = onSend;
    document.addEventListener('click', (e)=>{  
      const t = e.target && e.target.closest && e.target.closest('#send');
      if(t) onSend();
    }, true);

    // 엔터 처리
    input.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }
    });

    // Export 기능
    const btnExport = document.getElementById('btn-export');
    if(btnExport){
      btnExport.type = 'button';
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
  }

  document.addEventListener('DOMContentLoaded', boot, { once:true });
})();
