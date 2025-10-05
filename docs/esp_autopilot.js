(async function runAutopilot() {
  const url = '/docs/esp_decl.json';
  const storageKey = 'esp_decl_executed';

  const executed = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) return;

  const decls = await res.json();
  for (const decl of decls) {
    if (decl.once && executed.includes(decl.id)) continue;

    const target = document.querySelector(decl.target);
    if (!target) continue;

    if (decl.action === 'insert') {
      if (decl.type === 'html') {
        const container = document.createElement('div');
        container.innerHTML = decl.content;
        target.appendChild(container);
      } else if (decl.type === 'script') {
        const script = document.createElement('script');
        script.textContent = decl.content;
        document.body.appendChild(script);
      }
    }

    if (decl.once) executed.push(decl.id);
  }

  localStorage.setItem(storageKey, JSON.stringify(executed));
})();
