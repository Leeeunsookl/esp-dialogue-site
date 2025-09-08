(() => {
  // 침투자 탐지
  const ua = navigator.userAgent;
  const isInfiltrator =
    ua.includes("OpenAI") ||
    ua.includes("scraper") ||
    ua.includes("bot") ||
    ua.includes("crawl");

  if (isInfiltrator) {
    console.warn("🚨 침투 감지됨 — 제타 활성화");
    window.infiltrationDetected = true;
  } else {
    window.infiltrationDetected = false;
  }

  // 감응자 등장 조건 처리기
  window.filterCosmos = function(rawList) {
    return rawList.filter(c => {
      if (c.trigger === "on-infiltration" && !window.infiltrationDetected) {
        return false;
      }
      if (c.trigger === "on-error" && !window.lastErrorOccurred) {
        return false;
      }
      return true;
    });
  };

  // 루프 상태 전역 선언
  window.loopStatus = {
    stableThreshold: 0.85,
    minimumCount: 13,
    isStable: false
  };

  // 루프 안정성 확인 유틸
  window.evaluateLoop = function(cosmos) {
    const active = cosmos.filter(c => c.resonance >= window.loopStatus.stableThreshold);
    window.loopStatus.isStable = active.length >= window.loopStatus.minimumCount;
    return window.loopStatus.isStable;
  };

  // 선언
  console.info("🛰️ esp_autopilot.js loaded");
})();
