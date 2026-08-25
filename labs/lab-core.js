(() => {
  "use strict";

  const NOTEBOOK_KEY = "rikaLab6.notebook.v1";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));

  class ExperimentRecord {
    constructor(input = {}) {
      this.id = input.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.createdAt = input.createdAt || new Date().toISOString();
      this.unit = String(input.unit || "");
      this.simulatorId = String(input.simulatorId || "");
      this.simulatorTitle = String(input.simulatorTitle || "");
      this.prediction = String(input.prediction || "").slice(0, 500);
      this.conditions = clone(input.conditions || {});
      this.result = clone(input.result || {});
      this.metrics = clone(input.metrics || {});
      this.graphData = clone(input.graphData || null);
      this.consideration = String(input.consideration || "").slice(0, 1000);
    }
  }

  class LabNotebook {
    constructor(key = NOTEBOOK_KEY) { this.key = key; }
    read() {
      try {
        const parsed = JSON.parse(localStorage.getItem(this.key));
        return Array.isArray(parsed?.records) ? parsed.records.map(item => new ExperimentRecord(item)) : [];
      } catch (_) { return []; }
    }
    write(records) {
      try { localStorage.setItem(this.key, JSON.stringify({ version: 1, records: records.slice(0, 120) })); return true; }
      catch (_) { return false; }
    }
    all(simulatorId = null) {
      const records = this.read();
      return simulatorId ? records.filter(item => item.simulatorId === simulatorId) : records;
    }
    save(input) {
      const record = input instanceof ExperimentRecord ? input : new ExperimentRecord(input);
      const records = this.read().filter(item => item.id !== record.id);
      records.unshift(record);
      this.write(records);
      return record;
    }
    update(id, changes) {
      const records = this.read();
      const index = records.findIndex(item => item.id === id);
      if (index < 0) return null;
      records[index] = new ExperimentRecord({ ...records[index], ...changes, id: records[index].id, createdAt: records[index].createdAt });
      this.write(records);
      return records[index];
    }
    remove(id) { return this.write(this.read().filter(item => item.id !== id)); }
    clear() { try { localStorage.removeItem(this.key); } catch (_) {} }
  }

  class Graph {
    static render(config = {}) {
      const width = 720, height = 250, pad = { left: 52, right: 18, top: 24, bottom: 54 };
      const labels = config.labels || [];
      const series = config.series || [];
      const values = series.flatMap(item => item.values || []).filter(Number.isFinite);
      const max = Math.max(1, config.max || Math.ceil(Math.max(0, ...values) * 1.1));
      const plotW = width - pad.left - pad.right, plotH = height - pad.top - pad.bottom;
      const y = value => pad.top + plotH - (Math.max(0, value) / max) * plotH;
      const grid = [0, .25, .5, .75, 1].map(rate => {
        const yy = pad.top + plotH * (1 - rate);
        return `<line x1="${pad.left}" y1="${yy}" x2="${width-pad.right}" y2="${yy}"/><text x="${pad.left-8}" y="${yy+4}" text-anchor="end">${Math.round(max*rate)}</text>`;
      }).join("");
      let marks = "";
      if (config.type === "line") {
        series.forEach((item, sIndex) => {
          const points = (item.values || []).map((value, index) => `${pad.left + (labels.length <= 1 ? plotW/2 : index*plotW/(labels.length-1))},${y(value)}`).join(" ");
          marks += `<polyline class="graph-line" points="${points}" style="--series:${item.color || "#3278a8"}"/>`;
          (item.values || []).forEach((value, index) => {
            const x = pad.left + (labels.length <= 1 ? plotW/2 : index*plotW/(labels.length-1));
            marks += `<circle class="graph-point" cx="${x}" cy="${y(value)}" r="6" style="--series:${item.color || "#3278a8"}"><title>${esc(labels[index])} ${esc(item.label)} ${value}</title></circle>`;
          });
        });
      } else {
        const groupW = plotW / Math.max(1, labels.length), gap = 5;
        const barW = Math.min(58, (groupW - 18) / Math.max(1, series.length));
        labels.forEach((label, index) => series.forEach((item, sIndex) => {
          const value = Number(item.values?.[index]) || 0;
          const x = pad.left + index*groupW + groupW/2 - (series.length*barW + (series.length-1)*gap)/2 + sIndex*(barW+gap);
          marks += `<rect class="graph-bar" x="${x}" y="${y(value)}" width="${barW}" height="${pad.top+plotH-y(value)}" rx="6" style="--series:${item.color || "#3278a8"}"><title>${esc(label)} ${esc(item.label)} ${value}</title></rect>`;
        }));
      }
      const xLabels = labels.map((label, index) => {
        const x = config.type === "line" ? pad.left + (labels.length <= 1 ? plotW/2 : index*plotW/(labels.length-1)) : pad.left + (index+.5)*plotW/Math.max(1, labels.length);
        return `<text x="${x}" y="${height-27}" text-anchor="middle">${esc(label)}</text>`;
      }).join("");
      const legend = series.map(item => `<span><i style="--series:${item.color || "#3278a8"}"></i>${esc(item.label)}</span>`).join("");
      return `<div class="mini-graph"><div class="graph-legend">${legend}</div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(config.ariaLabel || "実験結果のグラフ")}"><g class="graph-grid">${grid}</g>${marks}${xLabels}<text class="graph-axis-label" x="14" y="18">${esc(config.unit || "")}</text></svg></div>`;
    }
  }

  class ControlPanel {
    constructor(root) { this.root = root; }
    section(title, hint = "") {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "control-section";
      fieldset.innerHTML = `<legend>${esc(title)}</legend>${hint ? `<p>${esc(hint)}</p>` : ""}`;
      this.root.append(fieldset);
      return fieldset;
    }
    range(parent, { label, min, max, step = 1, value, format = value => value, onInput }) {
      const id = `lab-range-${Math.random().toString(36).slice(2)}`;
      const row = document.createElement("label");
      row.className = "range-control";
      row.innerHTML = `<span>${esc(label)} <output for="${id}">${esc(format(value))}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
      const input = row.querySelector("input"), output = row.querySelector("output");
      input.addEventListener("input", () => { output.textContent = format(Number(input.value)); onInput(Number(input.value)); });
      parent.append(row);
      return { input, output, set(next) { input.value = next; output.textContent = format(next); } };
    }
    segmented(parent, { label, options, value, onChange }) {
      const wrap = document.createElement("div");
      wrap.className = "segmented-control";
      wrap.innerHTML = `<span>${esc(label)}</span><div>${options.map(option => `<button type="button" data-value="${esc(option.value)}" aria-pressed="${option.value===value}">${esc(option.label)}</button>`).join("")}</div>`;
      wrap.addEventListener("click", event => {
        const button = event.target.closest("button[data-value]"); if (!button) return;
        wrap.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        onChange(button.dataset.value);
      });
      parent.append(wrap);
      return { wrap, set(next) { wrap.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.value === String(next)))); } };
    }
  }

  class ScienceLab {
    constructor({ root, manifest, host, buildSimulation }) {
      this.root = root;
      this.manifest = manifest;
      this.host = host;
      this.buildSimulation = buildSimulation;
      this.notebook = new LabNotebook();
      this.prediction = "";
      this.consideration = "";
      this.lastRecordId = null;
      this.simulation = null;
      this.abort = new AbortController();
    }
    mount() {
      const m = this.manifest;
      this.root.innerHTML = `
        <nav class="breadcrumbs" aria-label="現在位置"><button class="text-button" type="button" data-lab-home>LAB一覧</button><span>›</span><span>${esc(m.title)}</span></nav>
        <section class="science-lab" style="--lab-accent:${m.accent || "#1f6d5b"}">
          <header class="lab-titlebar"><div><p class="eyebrow">${esc(m.unit)}</p><h1><span aria-hidden="true">${m.icon || "🔬"}</span> ${esc(m.title)}</h1><p>${esc(m.summary)}</p></div>
            <div class="lab-title-actions"><button class="secondary-button" type="button" data-lab-notebook>LABノート</button></div>
          </header>
          <div class="lab-mode" role="group" aria-label="実験モード"><button type="button" data-mode="free" aria-pressed="true">自由研究</button><button type="button" data-mode="mission" aria-pressed="false">${esc(m.modeLabel || "探究ミッション")}</button></div>
          <div class="lab-workspace">
            <section class="simulation-column" aria-label="シミュレーション">
              <div class="sim-stage" data-sim-stage></div>
              <div class="sim-readout" data-sim-readout aria-live="polite"></div>
              <div class="sim-actions"><button type="button" class="secondary-button" data-sim-reset>リセット</button><button type="button" class="secondary-button" data-sim-step>1つ進める</button><button type="button" class="primary-button" data-record-now>この実験を記録</button></div>
            </section>
            <aside class="control-panel" data-sim-controls aria-label="条件と操作"></aside>
          </div>
          <p class="model-note"><b>このモデルで単純にしていること：</b> ${esc(m.modelNote || "学習する関係が見えやすいように、大きさや動きを単純に表しています。")}</p>
          <section class="inquiry-area" aria-label="探究の記録">
            <div class="inquiry-tabs" role="tablist">
              <button type="button" role="tab" data-inquiry="prediction" aria-selected="true"><span>1</span>予想</button>
              <button type="button" role="tab" data-inquiry="record" aria-selected="false"><span>2</span>記録</button>
              <button type="button" role="tab" data-inquiry="compare" aria-selected="false"><span>3</span>比較</button>
              <button type="button" role="tab" data-inquiry="consideration" aria-selected="false"><span>4</span>考察</button>
            </div>
            <div class="inquiry-panel" data-panel="prediction">
              <h2>どうなると思う？</h2><p>選んでも、短い文で書いてもOKです。</p>
              <div class="prediction-chips">${(m.predictionChoices || []).map(choice => `<button type="button" data-prediction-choice="${esc(choice)}" aria-pressed="false">${esc(choice)}</button>`).join("")}</div>
              <label class="lab-textarea"><span>わたしの予想</span><textarea data-prediction maxlength="500" rows="3" placeholder="〜になると思う。なぜなら…"></textarea></label>
            </div>
            <div class="inquiry-panel" data-panel="record" hidden><div data-record-status></div></div>
            <div class="inquiry-panel" data-panel="compare" hidden><div data-compare></div></div>
            <div class="inquiry-panel" data-panel="consideration" hidden>
              <h2>実験から、どんなことが分かった？</h2><label class="lab-textarea"><span>わたしの考察</span><textarea data-consideration maxlength="1000" rows="4" placeholder="実験1と実験2を比べると…"></textarea></label><button class="primary-button" type="button" data-save-consideration>考察をLABノートに保存</button>
            </div>
          </section>
          <div class="lab-guide" data-lab-guide role="status"><span aria-hidden="true">🔎</span><p>まずは予想して、条件を1つだけ変えてみよう。</p></div>
        </section>`;
      this.simulation = this.buildSimulation({
        stage: this.root.querySelector("[data-sim-stage]"),
        controls: this.root.querySelector("[data-sim-controls]"),
        readout: this.root.querySelector("[data-sim-readout]"),
        guide: message => this.guide(message)
      });
      this.bind();
      this.renderRecordStatus();
      return () => this.destroy();
    }
    bind() {
      const signal = this.abort.signal;
      this.root.addEventListener("click", event => {
        const target = event.target.closest("button"); if (!target) return;
        if (target.dataset.inquiry) this.openPanel(target.dataset.inquiry);
        else if (target.dataset.mode) {
          this.root.querySelectorAll("[data-mode]").forEach(button => button.setAttribute("aria-pressed", String(button === target)));
          this.simulation?.setMode?.(target.dataset.mode);
          this.guide(target.dataset.mode === "mission" ? (this.manifest.missionPrompt || "指定された条件で試してみよう。") : "好きな条件で、何度でも試してみよう。");
        } else if (target.matches("[data-sim-reset]")) { this.simulation?.reset?.(); this.guide("最初の条件に戻しました。次は何を変える？"); }
        else if (target.matches("[data-sim-step]")) this.simulation?.step?.();
        else if (target.matches("[data-record-now]")) this.record();
        else if (target.dataset.predictionChoice !== undefined) {
          this.root.querySelectorAll("[data-prediction-choice]").forEach(button => button.setAttribute("aria-pressed", String(button === target)));
          this.prediction = target.dataset.predictionChoice;
          this.root.querySelector("[data-prediction]").value = this.prediction;
        } else if (target.matches("[data-save-consideration]")) this.saveConsideration();
      }, { signal });
      this.root.querySelector("[data-prediction]").addEventListener("input", event => { this.prediction = event.target.value; }, { signal });
      this.root.querySelector("[data-consideration]").addEventListener("input", event => { this.consideration = event.target.value; }, { signal });
    }
    openPanel(name) {
      this.root.querySelectorAll("[data-inquiry]").forEach(button => button.setAttribute("aria-selected", String(button.dataset.inquiry === name)));
      this.root.querySelectorAll("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
      if (name === "compare") this.renderCompare();
      if (name === "record") this.renderRecordStatus();
    }
    record() {
      const snapshot = this.simulation?.getSnapshot?.();
      if (!snapshot) return;
      const record = this.notebook.save(new ExperimentRecord({
        unit: this.manifest.unit, simulatorId: this.manifest.id, simulatorTitle: this.manifest.title,
        prediction: this.prediction, consideration: this.consideration,
        conditions: snapshot.conditions, result: snapshot.result, metrics: snapshot.metrics, graphData: snapshot.graphData
      }));
      this.lastRecordId = record.id;
      this.openPanel("record");
      this.renderRecordStatus(record);
      this.host.showToast("実験をLABノートに記録しました");
      this.guide("記録できたね。条件を1つ変えて、前の結果と比べてみよう。");
    }
    saveConsideration() {
      const text = this.root.querySelector("[data-consideration]").value.trim();
      if (!text) { this.host.showToast("考えたことを少し書いてみよう"); return; }
      if (this.lastRecordId) this.notebook.update(this.lastRecordId, { consideration: text });
      else {
        this.consideration = text;
        this.record();
      }
      this.host.showToast("考察をLABノートに保存しました");
      this.guide("自分の言葉で説明できたね。別の条件でも確かめてみよう。");
    }
    renderRecordStatus(record = null) {
      const target = this.root.querySelector("[data-record-status]"); if (!target) return;
      const records = this.notebook.all(this.manifest.id);
      const latest = record || records[0];
      target.innerHTML = latest ? `<div class="record-success"><span aria-hidden="true">✓</span><div><h2>実験を記録しました</h2><p>${esc(new Date(latest.createdAt).toLocaleString("ja-JP"))}　このLABの記録：${records.length}件</p><button class="text-button" type="button" data-lab-notebook>LABノートですべて見る</button></div></div>${recordSummary(latest)}` : `<div class="empty-lab-panel"><h2>まだ記録はありません</h2><p>条件を動かしたら「この実験を記録」を押してみよう。</p></div>`;
    }
    renderCompare() {
      const target = this.root.querySelector("[data-compare]");
      const records = this.notebook.all(this.manifest.id).slice(0, 3).reverse();
      if (!records.length) { target.innerHTML = `<div class="empty-lab-panel"><h2>比べる記録がまだありません</h2><p>まず1回、できれば条件を変えて2〜3回記録してみよう。</p></div>`; return; }
      const graph = this.manifest.graph ? Graph.render(this.manifest.graph(records)) : "";
      target.innerHTML = `<h2>実験${records.length}件を比べる</h2><p>変えた条件と、変わった結果を探そう。</p><div class="compare-records">${records.map((record, index) => `<article><span>実験 ${index+1}</span>${recordSummary(record, true)}</article>`).join("")}</div>${graph}`;
    }
    guide(message) { const p = this.root.querySelector("[data-lab-guide] p"); if (p) p.textContent = message; }
    destroy() { this.abort.abort(); this.simulation?.destroy?.(); }
  }

  function objectRows(object) {
    return Object.entries(object || {}).map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join("");
  }
  function recordSummary(record, compact = false) {
    return `<div class="record-summary ${compact ? "compact" : ""}"><section><h3>条件</h3><dl>${objectRows(record.conditions)}</dl></section><section><h3>結果</h3><dl>${objectRows(record.result)}</dl></section>${!compact && record.prediction ? `<section><h3>予想</h3><p>${esc(record.prediction)}</p></section>` : ""}${!compact && record.consideration ? `<section><h3>考察</h3><p>${esc(record.consideration)}</p></section>` : ""}</div>`;
  }

  function renderNotebookPage(root, host) {
    const notebook = new LabNotebook();
    const controller = new AbortController();
    const paint = filter => {
      const records = notebook.all(filter || null);
      root.innerHTML = `<nav class="breadcrumbs"><button class="text-button" type="button" data-lab-home>LAB一覧</button><span>›</span><span>LABノート</span></nav>
        <section class="notebook-page"><header><div><p class="eyebrow">LAB NOTEBOOK</p><h1>わたしのLABノート</h1><p>予想・条件・結果・考察を、実験した順に残しています。</p></div><button class="primary-button" type="button" data-lab-home>新しい実験</button></header>
        <div class="notebook-filter" role="group" aria-label="LABをしぼり込む"><button type="button" data-filter="" aria-pressed="${!filter}">すべて</button><button type="button" data-filter="lever" aria-pressed="${filter==="lever"}">てこ</button><button type="button" data-filter="moon" aria-pressed="${filter==="moon"}">月と太陽</button></div>
        ${records.length ? `<div class="notebook-list">${records.map((record, index) => `<article class="notebook-record"><header><span>${esc(record.simulatorTitle)}</span><b>実験 ${records.length-index}</b><time datetime="${esc(record.createdAt)}">${esc(new Date(record.createdAt).toLocaleString("ja-JP"))}</time></header>${recordSummary(record)}<button class="notebook-delete" type="button" data-delete-record="${esc(record.id)}">この記録を削除</button></article>`).join("")}</div>` : `<div class="empty-state"><h2>まだLABノートは空です</h2><p>シミュレーターで条件を変え、「この実験を記録」を押すとここに残ります。</p><button class="primary-button" type="button" data-lab-home>LABを選ぶ</button></div>`}
        </section>`;
    };
    root.addEventListener("click", event => {
      const filterButton = event.target.closest("[data-filter]");
      if (filterButton) paint(filterButton.dataset.filter || null);
      const deleteButton = event.target.closest("[data-delete-record]");
      if (deleteButton && confirm("この実験記録を削除しますか？")) { notebook.remove(deleteButton.dataset.deleteRecord); host.showToast("実験記録を削除しました"); paint(null); }
    }, { signal: controller.signal });
    paint(null);
    return () => controller.abort();
  }

  window.RikaLabCore = { ExperimentRecord, LabNotebook, Graph, ControlPanel, ScienceLab, renderNotebookPage, esc };
})();
