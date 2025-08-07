let currentStageIndex = 0;

function displayStage(stage) {
  const chatBox = document.getElementById("chat-box");
  const stageData = conversationFlow.loopA.find(item => item.stage === stage);

  if (!stageData) return;

  const message = document.createElement("div");
  message.className = "chat-message";
  message.innerText = stageData.text;
  chatBox.appendChild(message);

  stageData.options.forEach(option => {
    const button = document.createElement("button");
    button.innerText = option.label;
    button.onclick = () => {
      displayStage(option.next);
    };
    chatBox.appendChild(button);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;

  const chatBox = document.getElementById("chat-box");
  const userMsg = document.createElement("div");
  userMsg.className = "chat-message";
  userMsg.innerText = `사용자: ${text}`;
  chatBox.appendChild(userMsg);

  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;
}

window.onload = () => {
  displayStage("A-1");
};
