// esp_autopilot.js — DOM-agnostic input/button finder + IME-safe send
(function(){
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }

  // Visible error overlay
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

    // 1) 입력창 후보 자동 탐색 (마지막 텍스트 입력 필드 우선)
    const inputCandidates = Array.from(document.querySelectorAll([
      '#input','textarea#input','[data-role="input"]','textarea[name="message"]',
      'textarea','input[type="text"]','input[type="search"]'
    ].join(',')));
    const input = inputCandidates.at(-1) || null;

    // 2) 전송 버튼 탐색: id/class/data-attr → 입력 주변(부모 4단계 내) 버튼
    function findSendButton(){
      let el =
        $('#send') ||
        document.querySelector('[data-action="send"], .send, button.send, [aria-label*="send" i], [aria-label*="전송"]');
      if (el) return el;
      if (!input) return null;
      let p = input.parentElement, depth = 0;
      while (p && depth < 4){
        const b = p.querySelector('button, [role="button"]');
        if (b) return b;
        p = p.parentElement; depth++;
      }
      // fallback: 화면 내 가장 마지막 버튼
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      return buttons.at(-1) || null;
    }
    const sendBtn = findSendButton();

    // 3) 로그 보드(없으면 생성)
    let board =
      $('#board') ||
      document.querySelector('.board') ||
      null;
    if (!board){
      board = document.createElement('div');
      board.id = 'board';
      board.style.cssText = 'border:1px solid #1a2028;background:#10151b;border-radius:14px;min-height:40dvh;max-height:70dvh;overflow:auto;padding:12px;margin:12px 0;';
      // 입력창 위에 끼워넣기
      if (input && input.parentElement) input.parentElement.before(board);
      else document.body.prepend(board);
    }

    // 4) 메트릭(없으면 생성)
    let metrics = $('#metrics');
    if(!metrics){
      metrics = document.createElement('div');
      metrics.id = 'metrics';
      metrics.style.cssText = 'margin-top:8px;color:#a9c3d4;font:14px/1.5 system-ui;';
      board.after(metrics);
    }

    // 방어: 입력/버튼 없으면 안내만 띄우고 종료
    if (!input || !sendBtn){
      const miss = !input && !sendBtn ? 'input & button'
                 : !input ? 'input'
                 : 'button';
      const warn = document.createElement('div');
      warn.style.cssText = 'margin:10px 0;color:#ffc9c9';
      warn.textContent = `ESP: UI element not found (${miss}).`;
      board.appendChild(warn);
      return;
    }

    // 5) 공용 상태/도우미
    const state = { cnt:{ total:0, auto:0, reject:0, silence:0 } };
    const now = () => new Date().toLocaleTimeString();

    function renderMetrics(){
      const {auto,total,reject,silence} = state.cnt;
      const autonomy = total ? ((auto/total)*100).toFixed(1) : "0.0";
      metrics.textContent = `Autonomy ${autonomy}% · total ${total} · reject ${reject} · silence ${silence}`;
    }
    function addRow(who, text){
      const row = document.createElement('div'); row.className='row';
      row.style.margin = '10px 0';
      const bubble = document.createElement('div'); bubble.className='bubble';
      bubble.style.cssText = 'display:inline-block;background:#0e141b;border:1px solid #19222c;padding:10px 12px;border-radius:14px;max-width:92%';
      bubble.textContent = text;
      const meta = document.createElement('div'); meta.className='meta';
      meta.style.cssText = 'font-size:12px;color:#8aa0b3;margin-top:4px';
      meta.textContent = `${who} · ${now()}`;
      row.appendChild(bubble); row.appendChild(meta);
      board.appendChild(row);
      board.scrollTop = board.scrollHeight;
    }

    // 6) 전송(IME 안전 + 멀티 이벤트)
    let composing = false;

    function handleSend(){
      requestAnimationFrame(()=>{
        const text = (input.value || "").trim();
        if(!text) return;
        addRow('나', text);
        state.cnt.total++;

        // mock reply
        setTimeout(()=>{
          addRow('심연', '단계별 실행안을 바로 제시합니다.');
          state.cnt.auto++; renderMetrics();
        }, 80);

        input.value = '';
        input.focus();
        renderMetrics();
      });
    }

    const fireSend = (e)=>{ e.preventDefault?.(); e.stopPropagation?.(); handleSend(); };

    // 버튼: 다양한 포인터 이벤트 수신
    ['click','pointerup','touchend','mouseup','keyup'].forEach(ev=>{
      sendBtn.addEventListener(ev, (e)=>{
        if (ev === 'keyup' && e.key !== 'Enter') return;
        fireSend(e);
      }, { passive:false });
    });

    // 입력: IME 조합 감지
    input.addEventListener('compositionstart', ()=>{ composing = true; });
    input.addEventListener('compositionend', ()=>{ composing = false; });
    input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey && !composing && !e.isComposing){
        e.preventDefault(); handleSend();
      }
    });
    // 일부 키보드 보강
    input.addEventListener('keyup', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey && !composing && !e.isComposing){
        e.preventDefault(); handleSend();
      }
    });

    // 포커스/터치 보정
    input.removeAttribute('disabled');
    input.style.pointerEvents = 'auto';
    input.addEventListener('touchstart', ()=>input.focus(), { passive:true });

    renderMetrics();
  });
})();
