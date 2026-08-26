(() => {
  "use strict";

  const LAB_ASSET_VERSION = "simulator-upgrade-20260826-1";

  const MANIFESTS = {
    lever: {
      id: "lever",
      title: "てこLAB",
      unit: "てこのはたらき",
      icon: "⚖️",
      summary: "支点・おもり・位置を直接動かし、つり合いのきまりを探します。",
      accent: "#b66b32",
      script: "labs/lever-lab.js",
      ready: true
    },
    moon: {
      id: "moon",
      title: "月と太陽LAB",
      unit: "月と太陽",
      icon: "🌗",
      summary: "宇宙からの位置関係と、地球から見える月を同時に比べます。",
      accent: "#5266a8",
      script: "labs/moon-lab.js",
      ready: true
    }
  };
  [
    ["burning", "燃焼LAB", "ものの燃え方と空気", "🔥", "酸素の量と空気の通り道で、炎の変化を見ます。", "#c95b38"],
    ["solutions", "水溶液LAB", "水溶液の性質", "🧪", "指示薬・蒸発・金属の変化を操作して比べます。", "#377a86"],
    ["electricity", "電気LAB", "電気の利用", "💡", "光・運動・熱へのエネルギーの変換を見ます。", "#bd8a13"],
    ["plants", "植物LAB", "植物のからだのはたらき", "🌿", "光・水・葉を変えて、水の移動と蒸散を見ます。", "#3f8052"],
    ["body", "人の体LAB", "動物のからだのはたらき", "🫀", "運動量を変えて、心拍・呼吸・血液の流れを見ます。", "#bd4b62"],
    ["environment", "生物と環境LAB", "生物と環境", "🕸️", "生物の数を変え、食物連鎖の変化を見ます。", "#4e7d69"],
    ["earth", "大地LAB", "大地のつくりと変化", "🌋", "水の流れや火山灰で、地層のでき方を見ます。", "#8b6247"]
  ].forEach(([id,title,unit,icon,summary,accent]) => MANIFESTS[id] = {
    id,title,unit,icon,summary,accent,script:`labs/${id}-lab.js`,ready:true
  });
  const FUTURE = [
    ["🔥", "燃焼LAB", "酸素量と炎"], ["🧪", "水溶液LAB", "性質と変化"],
    ["💡", "電気LAB", "回路と変換"], ["🌿", "植物LAB", "水の通り道"],
    ["🫀", "人の体LAB", "呼吸と血液"], ["🕸️", "生物と環境LAB", "個体数の変化"],
    ["🌋", "大地LAB", "長い時間の変化"]
  ];
  const UNIT_ORDER = window.SCIENCE_UNIT_ORDER || [
    "burning", "solutions", "lever", "electricity", "body",
    "plants", "environment", "moon", "earth"
  ];
  const loaded = new Map();
  let activeCleanup = null;

  function loadScript(src) {
    if (loaded.has(src)) return loaded.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const separator = src.includes("?") ? "&" : "?";
      script.src = `${src}${separator}v=${LAB_ASSET_VERSION}`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    promise.catch(() => loaded.delete(src));
    loaded.set(src, promise);
    return promise;
  }

  async function ensureCore() {
    if (!window.RikaLabCore) await loadScript("labs/lab-core.js");
    return window.RikaLabCore;
  }

  function catalogMarkup() {
    return `
      <nav class="breadcrumbs" aria-label="現在位置"><button class="text-button" type="button" data-home>単元一覧</button><span>›</span><span>LAB</span></nav>
      <section class="lab-library-hero">
        <div><p class="eyebrow">SCIENCE LAB</p><h1>条件を変えると、何が変わる？</h1><p>答えを当てる場所ではありません。条件を動かして、現象の変化を見つける実験室です。</p></div>
      </section>
      <section class="lab-library" aria-labelledby="readyLabs"><div class="section-heading"><h2 id="readyLabs">実験できるLAB</h2><p>好きな方から始めよう</p></div>
        <div class="lab-card-grid">${UNIT_ORDER.map(id => MANIFESTS[id]).filter(Boolean).map(lab => `
          <button class="lab-card" type="button" data-lab-id="${lab.id}" style="--lab-accent:${lab.accent}">
            <span class="lab-card-icon" aria-hidden="true">${lab.icon}</span><span class="lab-card-tag">${lab.unit}</span>
            <h2>${lab.title}</h2><p>${lab.summary}</p><b>実験を始める →</b>
          </button>`).join("")}</div>
      </section>
      `;
  }

  async function render(route, root, host) {
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
    if (!route.labId) { root.innerHTML = catalogMarkup(); return; }
    const manifest = MANIFESTS[route.labId];
    if (!manifest) { root.innerHTML = `<section class="empty-state"><h1>このLABはまだありません</h1><button class="primary-button" type="button" data-lab-home>LAB一覧へ</button></section>`; return; }
    root.innerHTML = `<section class="lab-loading"><span class="lab-loading-mark" aria-hidden="true">${manifest.icon}</span><h1>${manifest.title}を準備しています</h1><p>このLABに必要な実験道具だけを読み込んでいます。</p></section>`;
    const core = await ensureCore();
    await loadScript(manifest.script);
    const factory = window.RikaLabSimulations?.[manifest.id];
    if (!factory) throw new Error("Simulation factory missing");
    activeCleanup = factory.mount(root, { core, host, manifest }) || null;
  }

  function clearAll() {
    try { localStorage.removeItem("rikaLab6.notebook.v1"); } catch (_) {}
  }

  function leave() {
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  }

  window.RikaLabRouter = { render, leave, clearAll, manifests: MANIFESTS };
})();
