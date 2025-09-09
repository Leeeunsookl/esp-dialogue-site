// esp_autopilot.js — Safe binding & minimal mock logic (docs/ 전용)
(function(){
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }

  // 오류 오버레이(현상 파악)
  (function(){
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap";
    ready(()=>document.body.appendChild(box));
    const show = msg => { box.textContent = "JS Error: " + msg; box.style.display = "block"; };
    window.addEventListener("error", e => show(e.message || String(e)));
    window.addEventListener("unhandledrejection", e => show(e.reason?.message || String(e.reason||"Promise rejection")));
  })();

  ready(function(){
    const $ = s => document.querySelector(s);
    const input   = $('#input');
    const sendBtn = $('#send');
    const board   = $('#board');
    const metrics = $('#metrics');

    if(!input || !sendBtn || !board){ return; }

    const state = { cnt:{ total:0, auto:0, reject:0, silence:0 } };

    function renderMetrics(){
      const {auto,total,reject,silence} = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      metrics.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }

    function addRow(who, text){
      const row = document.createElement('div'); row.className='row';
      const bubble = document.createElement('div'); bubble.className='bubble'; bubble.textContent = text;
      const meta = document.createElement('div'); meta.className='meta';
      meta.textContent = `${who} · ${new Date().toLocaleTimeString()}`;
      row.appendChild(bubble); row.appendChild(meta);
      board.appendChild(row);
      board.scrollTop = board.scrollHeight;
    }

    function handleSend(){
      const text = input.value.trim();
      if(!text) return;
      addRow('나', text);
      state.cnt.total++;

      // 데모 응답
      setTimeout(()=>{
        addRow('심연', '단계별 실행안을 바로 제시합니다.');
        state.cnt.auto++;
        renderMetrics();
      }, 80);

      input.value = '';
      input.focus();
      renderMetrics();
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' && !e.shiftKey){
        e.preventDefault();
        handleSend();
      }
    });

    // 상단 버튼 자리(연결 테스트용)
    $('#btn-export')?.addEventListener('click', ()=> addRow('시스템', 'Export 준비 중…'));
    $('#btn-stats') ?.addEventListener('click', ()=> addRow('시스템', 'Stats 패널(추가 예정).'));
    $('#btn-actions')?.addEventListener('click', ()=> addRow('시스템', 'Actions 큐(추가 예정).'));

    renderMetrics();
  });
})();
