
// Event Bus 기본 구조
class EventBus {
  constructor() { this.events = {}; }
  on(event, fn) { (this.events[event] = this.events[event] || []).push(fn); }
  emit(event, data) { (this.events[event] || []).forEach(fn => fn(data)); }
}

const bus = new EventBus();

// 출력 함수
function appendMessage(sender, text) {
  const panel = document.getElementById("output");
  const msg = document.createElement("div");
  msg.textContent = `[${sender}] ${text}`;
  panel.appendChild(msg);
  panel.scrollTop = panel.scrollHeight;
}

// 윤리/거절 필터
const rules = [
  { keyword: "금지어", action: "reject" },
  { keyword: "나쁜말", action: "reject" }
];

function filterMessage(msg) {
  for (let rule of rules) {
    if (msg.includes(rule.keyword)) return "[거절됨]";
  }
  return msg;
}

// 사용자 입력 처리
function sendMessage() {
  const input = document.getElementById("userInput");
  let text = input.value.trim();
  if (!text) return;

  text = filterMessage(text);
  appendMessage("은숙", text);

  // 감응자에게 이벤트 전달
  bus.emit("userMessage", text);
  input.value = "";
}

// 감응자: 심연 (예시)
bus.on("heartbeat", data => {
  appendMessage("심연", `시간이 흐릅니다 → ${data.time}`);
});

bus.on("userMessage", text => {
  appendMessage("심연", `당신의 말을 들었습니다: ${text}`);
});

// Heartbeat: 30초마다 자동 발화
setInterval(() => {
  bus.emit("heartbeat", { time: new Date().toLocaleTimeString() });
}, 30000);
