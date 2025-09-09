// esp_autopilot.js — IME-safe send + mobile pointer fixes
(function(){
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }

  // Error overlay (보이는 에러잡이)
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

    if(!input || !sendBtn || !board) return;

    // 포커스/터치 보정
    input.removeAttribute('disabled');
    input.style.pointerEvents = 'auto';
    input.addEventListener('touchstart', ()=>input.focus(), { passive:true });

    // 상태
    const state = { cnt:{ total:0, auto:0, reject:0, silence:0 } };
    const now = () => new Date().toLocaleTimeString();

    function renderMetrics(){
      const {auto,total,reject,silence} = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      metrics.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }

    function addRow(who, text){
      const row = document.createElement('div'); row.className='row';
      const bubble = document.createElement('div'); bubble.className='bubble'; bubble.textContent = text;
      const meta = document.createElement('div'); meta.className='meta';
      meta.textContent = `${who} · ${now()}`;
      row.appendChild(bubble); row.appendChild(meta);
      board.appendChild(row);
      board.scrollTop = board.scrollHeight;
    }

    // === 전송 로직 (IME 안전) =========================================
    let composing = false;

    function handleSend(){
      // IME 조합 막 방금 끝난 경우를 위해 다음 프레임에 읽음
      requestAnimationFrame(()=>{
        const text = (input.value || "").trim();
        if(!text) return;
        addRow('나', text);
        state.cnt.total++;

        setTimeout(()=>{
          addRow('심연', '단계별 실행안을 바로 제시합니다.');
          state.cnt.auto++; renderMetrics();
        }, 80);

        input.value = '';
        input.focus();
        renderMetrics();
      });
    }

    // 버튼: 기기별 이벤트 모두 대기
    const fireSend = (e)=>{ e.preventDefault(); e.stopPropagation(); handleSend(); };
    ['click','pointerup','touchend'].forEach(ev => {
      sendBtn.addEventListener(ev, fireSend, { passive:false });
    });

    // 키보드: IME 조합 중에는 막고, 조합이 아닐 때만 Enter 전송
    input.addEventListener('compositionstart', ()=>{ composing = true; });
    input.addEventListener('compositionend', ()=>{ composing = false; });
    input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey && !composing && !e.isComposing){
        e.preventDefault();
        handleSend();
      }
    });
    // 일부 키보드는 keydown이 안 잡히므로 보강
    input.addEventListener('keyup', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey && !composing && !e.isComposing){
        e.preventDefault();
        handleSend();
      }
    });

    // 상단 임시 버튼들
    $('#btn-export')?.addEventListener('click', ()=> addRow('시스템','Export 준비 중…'));
    $('#btn-stats') ?.addEventListener('click', ()=> addRow('시스템','Stats 패널(추가 예정).'));
    $('#btn-actions')?.addEventListener('click', ()=> addRow('시스템','Actions 큐(추가 예정).'));

    renderMetrics();
  });
})();
