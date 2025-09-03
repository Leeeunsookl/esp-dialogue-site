// 🛡️ ESP Dialog 워터마크 및 해시 출력 모듈

const ESP_WATERMARK = "espdialog.net::Structure-v1.2::©2025";

function insertWatermark() { const tag = document.createElement('meta'); tag.name = "espdialog-watermark"; tag.content = ESP_WATERMARK; document.head.appendChild(tag);

console.log("[ESP-WM] 워터마크 삽입 완료:", ESP_WATERMARK); }

function sha256(text) { const encoder = new TextEncoder(); const data = encoder.encode(text); return crypto.subtle.digest("SHA-256", data).then(hashBuffer => { const hashArray = Array.from(new Uint8Array(hashBuffer)); const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); return hashHex; }); }

function logPageHash() { const html = document.documentElement.outerHTML; sha256(html).then(hash => { console.log("[ESP-HASH] SHA256 페이지 해시:", hash); }); }

// 실행 insertWatermark(); logPageHash();

