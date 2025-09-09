<script>
(function(){
  // DOM ready
  function ready(fn){
    if(document.readyState!=='loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  }

  // 전역 어댑터 안전 초기화 (length 에러 방지)
  const Adapter = (window.Adapter = window.Adapter || {});
  if(!Array.isArray(Adapter.queue)) Adapter.queue = [];
  if(!Array.isArray(Adapter.log))   Adapter.log   = [];

  ready(()=> {
    const byId = (id)=> document.getElementById(id);
    const qs   = (s)=> document.querySelector(s);

    // 여러 버전 아이디 지원 (flow-*, btn-*, data-btn)
    const sendBtn    = byId('flow-send')    || byId('btn-send')    || qs('[data-btn="send"]');
    const exportBtn  = byId('flow-export')  || byId('btn-export')  || qs('[data-btn="export"]');
    const statsBtn   = byId('flow-stats')   || byId('btn-stats')   || qs('[data-btn="stats"]');
    const actionsBtn = byId('flow-actions') || byId('btn-actions') || qs('[data-btn="actions"]');

    const input  = byId('flow-input') || byId('input') || qs('textarea#input, textarea');
    const board  = byId('flow-log')   || byId('board') || qs('#board');
    const metric = byId('flow-metrics') || byId('metrics');
    const actPane= byId('flow-actions-pane') || byId('actions-pane') || qs('#flow-actions-pane');

    function tstr(t){ return new Date(t||Date.now()).toLocaleTimeString(); }

    function renderBoard(){
      if(!board) return;
      const html = (Adapter.log||[]).map(m=>{
        const who = m.role==='user' ? '👤 나' : `🤖 ${m.entity||'흐름'}`;
        return `<div class="row">
          <div class="bubble">${m.text||''}</div>
          <div class="meta">${who} · ${tstr(m.t)}</div>
        </div>`;
      }).join('');
      board.innerHTML = html;
      board.scrollTop = board.scrollHeight;
    }

    function renderMetrics(){
      if(!metric) return;
      const total = (Adapter.log||[]).filter(m=>m.role!=='system').length;
      const auto  = (Adapter.queue||[]).filter(a=>a.actor!=='user').length;
      const autonomy = total ? ((auto/Math.max(total,1))*100).toFixed(1) : '0.0';
      metric.textContent = `자율성 ${autonomy}% · total ${total} · reject 0 · silence 0`;
    }

    function renderActions(){
      if(!actPane) return;
      const q = Array.isArray(Adapter.queue) ? Adapter.queue : [];
      const rows = q.slice(-50).map(a=>{
        return `• [${tstr(a.ts)}] ${a.type||'evt'} :: ${a.actor||'flow'} :: ${a.text||''}`;
      }).join('\n');
      actPane.innerHTML = `<pre style="white-space:pre-wrap;margin:0">${rows||'Actions: (empty)'}</pre>`;
    }

    function send(){
      const text = (input?.value || '').trim();
      if(!text) return;
      Adapter.log.push({ t:Date.now(), role:'user', text });
      Adapter.queue.push({ ts:Date.now(), type:'send', actor:'user', text });
      input.value = '';
      renderBoard(); renderMetrics(); renderActions();
    }

    // 바인딩 (존재할 때만)
    if(sendBtn)   sendBtn.onclick = send;
    if(input)     input.addEventListener('keydown', e=>{
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }
    });

    if(exportBtn) exportBtn.onclick = ()=>{
      const payload = { log:Adapter.log, queue:Adapter.queue, exportedAt:Date.now() };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `esp_state_${Date.now()}.json`;
      a.click();
    };

    if(statsBtn)  statsBtn.onclick  = renderMetrics;
    if(actionsBtn)actionsBtn.onclick= renderActions;

    // 초기 렌더
    renderBoard(); renderMetrics(); renderActions();
  });

  // 에러 오버레이(원인 바로 보기)
  (function(){
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#2b1a1a;color:#ffd8d8;border:1px solid #553;padding:8px;font:12px/1.4 system-ui;border-radius:8px;display:none;white-space:pre-wrap';
    window.addEventListener('DOMContentLoaded',()=>document.body.appendChild(box),{once:true});
    const show = (msg)=>{ box.textContent = 'JS Error: '+msg; box.style.display='block'; };
    window.addEventListener('error', e => show(e.message||String(e)));
    window.addEventListener('unhandledrejection', e => show(e.reason?.message || String(e.reason||'Promise rejection')));
  })();
})();
</script>
