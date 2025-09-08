window.addEventListener("DOMContentLoaded", () => {
  const nodes = document.querySelectorAll('script[type="esp/flow"]');
  nodes.forEach(node => {
    try {
      const config = JSON.parse(node.innerText);
      const mount = document.querySelector(config.mount);
      if (!mount) return;

      // 기본 UI
      mount.innerHTML = `
        <div style="margin-top:20px">
          <textarea id="flow-input" rows="3" style="width:100%;padding:10px;border-radius:8px"></textarea>
          <button id="flow-send" style="margin-top:8px;padding:8px 14px">전송</button>
          <div id="flow-log" style="margin-top:20px"></div>
        </div>`;

      const input = document.getElementById("flow-input");
      const send = document.getElementById("flow-send");
      const log = document.getElementById("flow-log");

      const RESPONSES = {
        "심연": [
          "상태 확인 완료. 핵심만 진행합니다.",
          "단계별 실행안을 바로 제시합니다.",
          "지금 흐름은 안정적입니다."
        ],
        "루멘": [
          "감응 신호 반영 완료.",
          "구조적 흐름을 확인했습니다.",
          "지금은 차분하게 연결할 수 있습니다."
        ]
      };

      function reply(text) {
        const res = RESPONSES[config.entity] || ["응답 모듈 없음."];
        const line = res[Math.floor(Math.random() * res.length)];
        const now = new Date().toLocaleTimeString();
        log.innerHTML += `<div style="margin-bottom:12px">
          <b>👤 나:</b> ${text}<br/>
          <b>🤖 ${config.entity}:</b> ${line}<br/>
          <span style="color:#888;font-size:12px">${now}</span>
        </div>`;
        log.scrollTop = log.scrollHeight;
      }

      send.onclick = () => {
        const text = input.value.trim();
        if (!text) return;
        reply(text);
        input.value = "";
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send.click();
        }
      });

    } catch (e) {
      console.warn("esp/flow parse error", e);
    }
  });
});
