(() => {
  "use strict";

  const STORAGE_KEY = "rikaLab6.v2";
  const PHASES = {
    knowledge: { label: "① 知識", sub: "大事な言葉をつなぐ" },
    preparation: { label: "② 実験・観察の準備", sub: "条件と証拠を整理する" },
    consideration: { label: "③ 考察", sub: "結果から説明する" }
  };
  const app = document.querySelector("#app");
  const toast = document.querySelector("#toast");
  const dialog = document.querySelector("#settingsDialog");
  const soundToggle = document.querySelector("#soundToggle");
  let answerState = { selected: null, checked: false, assignments: {}, selectedCard: null };
  let reviewState = null;
  const sessionItems = {};
  let labLoadPromise = null;
  let labRenderToken = 0;

  function defaultData() {
    return { version: 2, completed: {}, attempts: {}, mistakes: {}, sound: false };
  }

  function loadData() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return raw && raw.version === 2 ? { ...defaultData(), ...raw } : defaultData();
    } catch (_) { return defaultData(); }
  }

  let data = loadData();
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const activityKey = (unitId, phase, id) => `${unitId}.${phase}.${id}`;
  const unitById = id => window.SCIENCE_UNITS.find(unit => unit.id === id);
  const itemsFor = (unit, phase) => unit?.[phase] || [];
  function sessionFor(unit, phase) {
    const key = `${unit.id}.${phase}`;
    if (!sessionItems[key]) {
      const all = itemsFor(unit, phase);
      const unfinished = all.filter(item => !data.completed[activityKey(unit.id, phase, item.id)]);
      const source = unfinished.length ? unfinished : all;
      sessionItems[key] = [...source].sort(() => Math.random() - .5).slice(0, Math.min(3, source.length)).map(item => item.id);
    }
    return itemsFor(unit, phase).filter(item => sessionItems[key].includes(item.id));
  }
  const totalActivities = unit => Object.keys(PHASES).reduce((sum, phase) => sum + itemsFor(unit, phase).length, 0);
  const completedCount = unit => Object.keys(PHASES).reduce((sum, phase) => sum + itemsFor(unit, phase).filter(item => data.completed[activityKey(unit.id, phase, item.id)]).length, 0);
  const unitPercent = unit => Math.round(completedCount(unit) / totalActivities(unit) * 100);
  const phaseDone = (unit, phase) => itemsFor(unit, phase).every(item => data.completed[activityKey(unit.id, phase, item.id)]);
  const overall = () => {
    const total = window.SCIENCE_UNITS.reduce((sum, u) => sum + totalActivities(u), 0);
    const done = window.SCIENCE_UNITS.reduce((sum, u) => sum + completedCount(u), 0);
    return { done, total, percent: Math.round(done / total * 100) };
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[char]));
  }

  function routeTo(path) {
    location.hash = path;
    if (location.hash === path) render();
  }

  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (parts[0] === "unit") return { page: "unit", unitId: parts[1], phase: PHASES[parts[2]] ? parts[2] : "knowledge", index: Math.max(0, Number(parts[3]) || 0) };
    if (parts[0] === "review") return { page: "review" };
    if (parts[0] === "discoveries") return { page: "discoveries" };
    if (parts[0] === "lab" && parts[1] === "notebook") return { page: "lab-notebook" };
    if (parts[0] === "lab") return { page: "lab", labId: parts[1] || null };
    return { page: "home" };
  }

  function unitStyle(unit) {
    return `--unit-color:${unit.color};--unit-pale:${unit.pale}`;
  }

  function renderHome() {
    const progress = overall();
    app.innerHTML = `
      <section class="hero">
        <p class="eyebrow">小学6年生 理科</p>
        <h1>見えないしくみを、<br>証拠から考えよう。</h1>
        <p>現象を触って条件を変えるLABと、実験・観察を考える9つの単元。結果を比べ、証拠から自分の言葉で説明する力を育てます。</p>
        <div class="overall-progress">
          <div class="progress-label"><span>全体の学習記録</span><span>${progress.done} / ${progress.total}</span></div>
          <div class="progress-track" role="progressbar" aria-label="全体の進み具合" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
        </div>
      </section>
      <section class="lab-entrance" aria-labelledby="labEntranceTitle">
        <div class="lab-entrance-copy">
          <p class="eyebrow">SCIENCE LAB</p>
          <h2 id="labEntranceTitle">触って、変えて、きまりを見つける。</h2>
          <p>予想したら、条件を動かして何度でも実験。結果をLABノートへ残し、前の実験と比べられます。</p>
          <div class="lab-entrance-actions">
            <button class="primary-button" type="button" data-open-labs>LABをひらく</button>
            <button class="secondary-button" type="button" data-lab-notebook>LABノート</button>
          </div>
        </div>
        <div class="lab-preview" aria-label="公開中のLAB">
          <button type="button" data-lab-id="lever"><span>⚖️</span><b>てこLAB</b><small>重さと距離を動かす</small></button>
          <button type="button" data-lab-id="moon"><span>🌗</span><b>月と太陽LAB</b><small>2つの見方を比べる</small></button>
        </div>
      </section>${window.ScienceGame ? window.ScienceGame.panel() : ""}
      <div class="section-heading"><h2>9つの単元</h2><p>学びたい単元を選ぼう</p></div>
      <section class="unit-grid" aria-label="単元一覧">
        ${window.SCIENCE_UNITS.map((unit, index) => `
          <button class="unit-card" data-unit="${unit.id}" style="${unitStyle(unit)}">
            <span class="unit-top"><span class="unit-icon" aria-hidden="true">${unit.icon}</span><span class="unit-number">UNIT ${index + 1}</span></span>
            <h3>${unit.title}</h3><p>${unit.summary}</p>
            <span class="mini-progress"><span class="progress-track"><span class="progress-fill" style="width:${unitPercent(unit)}%"></span></span><span>${unitPercent(unit)}%</span></span>
          </button>`).join("")}
      </section>`;
  }

  function renderUnit(route) {
    const unit = unitById(route.unitId);
    if (!unit) { renderNotFound(); return; }
    const phase = route.phase;
    const items = sessionFor(unit, phase);
    const index = Math.min(route.index, items.length - 1);
    const item = items[index];
    answerState = { selected: null, checked: false, assignments: {}, selectedCard: null };
    app.innerHTML = `
      <nav class="breadcrumbs" aria-label="現在位置"><button class="text-button" data-home>単元一覧</button><span>›</span><span>${unit.title}</span></nav>
      <section class="unit-banner" style="${unitStyle(unit)}">
        <span class="unit-icon" aria-hidden="true">${unit.icon}</span>
        <div><h1>${unit.title}</h1><p>${unit.bigIdea}</p></div>
        <div class="unit-score"><b>${unitPercent(unit)}%</b><small>学習済み</small></div>
      </section>
      <div class="phase-tabs" role="tablist" aria-label="学習の段階">
        ${Object.entries(PHASES).map(([key, value]) => `<button class="phase-tab ${phaseDone(unit,key)?"is-done":""}" role="tab" aria-selected="${phase===key}" data-phase="${key}">${value.label}<small>${value.sub}</small></button>`).join("")}
      </div>
      <section class="activity-layout">
        <nav class="activity-nav" aria-label="この段階の問題"><h2>${PHASES[phase].label}</h2>${items.map((navItem, i) => `<button class="activity-dot ${i===index?"active":""} ${data.completed[activityKey(unit.id,phase,navItem.id)]?"done":""}" data-index="${i}">問題 ${i+1}</button>`).join("")}</nav>
        <article class="activity-card" data-unit-id="${unit.id}" data-phase="${phase}" data-index="${index}">
          ${phase === "preparation" ? preparationMarkup(item, index, items.length) : questionMarkup(item, index, items.length, phase)}
        </article>
      </section>`;
  }

  function questionMarkup(item, index, length, phase) {
    const isKnowledge = phase === "knowledge";
    return `
      <span class="activity-count">${index + 1} / ${length}　${isKnowledge ? "知識をつなぐ" : "証拠から考える"}</span>
      <h2>${item.prompt || item.question}</h2>
      ${isKnowledge && item.pair ? `<div class="pair-box"><div class="pair-item">${item.pair[0]}</div><span class="pair-vs">対にして覚える</span><div class="pair-item">${item.pair[1]}</div></div>` : ""}
      ${item.evidence ? `<div class="evidence"><b>観察・実験の結果</b>${item.evidence}</div>` : ""}
      <div class="choices" role="group" aria-label="答えを選ぶ">${item.choices.map((choice,i) => `<button class="choice" data-choice="${i}">${escapeHtml(choice)}</button>`).join("")}</div>
      <div class="answer-area"></div>
      <div class="action-row"><button class="secondary-button" data-prev ${index===0?"disabled":""}>前へ</button><button class="primary-button" data-check disabled>答えを確かめる</button></div>`;
  }

  function preparationMarkup(item, index, length) {
    return `
      <span class="activity-count">${index + 1} / ${length}　実験・観察を組み立てる</span>
      <h2>${item.title}</h2><p class="activity-lead">${item.lead}</p>
      <p class="sort-instruction">①カードをタップ　②入れる場所をタップ（入れ直すときは、下のカードをタップ）</p>
      <div class="sort-cards">${item.cards.map((card,i) => `<button class="sort-card" data-card="${i}">${escapeHtml(card.text)}</button>`).join("")}</div>
      <div class="buckets">${item.buckets.map(bucket => `<button class="bucket" data-bucket="${bucket.id}" type="button"><h3>${bucket.label}</h3><span class="bucket-items"></span></button>`).join("")}</div>
      <div class="answer-area"></div>
      <div class="action-row"><button class="secondary-button" data-prev ${index===0?"disabled":""}>前へ</button><button class="primary-button" data-check disabled>分け方を確かめる</button></div>`;
  }

  function renderNotFound() {
    app.innerHTML = `<section class="empty-state"><h1>ページが見つかりません</h1><p>単元一覧から学習を選び直してください。</p><button class="primary-button" data-home>単元一覧へ</button></section>`;
  }

  function getCurrentContext() {
    const card = document.querySelector(".activity-card");
    if (!card) return null;
    const unit = unitById(card.dataset.unitId);
    const phase = card.dataset.phase;
    const index = Number(card.dataset.index);
    return { card, unit, phase, index, item: sessionFor(unit, phase)[index] };
  }

  function chooseAnswer(button) {
    if (answerState.checked) return;
    answerState.selected = Number(button.dataset.choice);
    document.querySelectorAll(".choice").forEach(el => el.classList.toggle("selected", el === button));
    document.querySelector("[data-check]").disabled = false;
  }

  function selectSortCard(button) {
    if (answerState.checked) return;
    answerState.selectedCard = Number(button.dataset.card);
    document.querySelectorAll(".sort-card").forEach(el => el.classList.toggle("selected", el === button));
  }

  function assignCard(bucketId) {
    if (answerState.checked || answerState.selectedCard === null) return;
    answerState.assignments[answerState.selectedCard] = bucketId;
    answerState.selectedCard = null;
    updateBuckets();
  }

  function unassignCard(cardIndex) {
    if (answerState.checked) return;
    delete answerState.assignments[cardIndex];
    updateBuckets();
  }

  function updateBuckets() {
    const ctx = getCurrentContext();
    document.querySelectorAll(".sort-card").forEach((el, i) => {
      el.classList.toggle("assigned", answerState.assignments[i] !== undefined);
      el.classList.remove("selected");
    });
    document.querySelectorAll(".bucket").forEach(bucket => {
      const target = bucket.querySelector(".bucket-items");
      target.innerHTML = Object.entries(answerState.assignments)
        .filter(([, value]) => value === bucket.dataset.bucket)
        .map(([i]) => `<button class="bucket-chip" data-unassign="${i}" type="button">${escapeHtml(ctx.item.cards[Number(i)].text)} ×</button>`).join("");
    });
    document.querySelector("[data-check]").disabled = Object.keys(answerState.assignments).length !== ctx.item.cards.length;
  }

  function recordAttempt(ctx, correct, wrongCardIndexes = []) {
    const key = activityKey(ctx.unit.id, ctx.phase, ctx.item.id), wasCompleted = !!data.completed[key];
    if (!data.attempts[key]) data.attempts[key] = { count: 0, firstCorrect: null };
    const attempt = data.attempts[key];
    attempt.count += 1;
    if (attempt.firstCorrect === null) attempt.firstCorrect = correct;
    if (correct) data.completed[key] = true;
    wrongCardIndexes.forEach(i => { data.mistakes[`${key}.${i}`] = (data.mistakes[`${key}.${i}`] || 0) + 1; });
    save();
    window.ScienceGame?.award({ unitId: ctx.unit.id, phase: ctx.phase, itemId: ctx.item.id, correct, wasCompleted, unitComplete: correct && completedCount(ctx.unit) === totalActivities(ctx.unit) });
  }

  function checkAnswer() {
    const ctx = getCurrentContext();
    if (!ctx) return;
    if (ctx.phase === "preparation") checkPreparation(ctx);
    else checkQuestion(ctx);
  }

  function checkQuestion(ctx) {
    if (answerState.checked || answerState.selected === null) return;
    answerState.checked = true;
    const correct = answerState.selected === ctx.item.answer;
    recordAttempt(ctx, correct);
    document.querySelectorAll(".choice").forEach((el, i) => {
      el.disabled = true;
      el.classList.remove("selected");
      if (i === ctx.item.answer) el.classList.add("correct");
      if (i === answerState.selected && !correct) el.classList.add("wrong");
    });
    showFeedback(correct, ctx.item.explanation);
    playTone(correct);
    if (correct) setNextButton(ctx, true);
    else {
      const button = document.querySelector("[data-check]");
      button.disabled = false;
      button.textContent = "解き直す";
      button.removeAttribute("data-check");
      button.setAttribute("data-retry-question", "true");
    }
  }

  function checkPreparation(ctx) {
    if (answerState.checked || Object.keys(answerState.assignments).length !== ctx.item.cards.length) return;
    const wrong = ctx.item.cards.map((card, i) => answerState.assignments[i] === card.bucket ? -1 : i).filter(i => i >= 0);
    const correct = wrong.length === 0;
    recordAttempt(ctx, correct, wrong);
    if (correct) {
      answerState.checked = true;
      document.querySelectorAll(".sort-card, .bucket-chip").forEach(el => el.disabled = true);
      showFeedback(true, ctx.item.explanation);
      setNextButton(ctx, true);
    } else {
      wrong.forEach(i => delete answerState.assignments[i]);
      updateBuckets();
      showFeedback(false, `${wrong.length}枚をもう一度考えよう。正しく置けたカードはそのまま残しています。`);
    }
    playTone(correct);
  }

  function showFeedback(correct, explanation) {
    document.querySelector(".answer-area").innerHTML = `<div class="feedback ${correct?"correct":"wrong"}"><b>${correct ? "正解！" : "もう一度考えよう"}</b>${escapeHtml(explanation)}</div>`;
  }

  function setNextButton(ctx, correct) {
    if (!correct) return;
    const button = document.querySelector("[data-check]");
    const list = sessionFor(ctx.unit, ctx.phase);
    button.disabled = false;
    button.removeAttribute("data-check");
    if (ctx.index < list.length - 1) {
      button.textContent = "次の問題へ";
      button.dataset.next = String(ctx.index + 1);
    } else if (!phaseDone(ctx.unit, ctx.phase)) {
      delete sessionItems[`${ctx.unit.id}.${ctx.phase}`];
      button.textContent = "次の研究へ";
      button.dataset.nextBatch = "true";
    } else {
      const phaseKeys = Object.keys(PHASES);
      const nextPhase = phaseKeys[phaseKeys.indexOf(ctx.phase) + 1];
      button.textContent = nextPhase ? `次の段階へ` : "単元一覧へ";
      button.dataset.nextPhase = nextPhase || "home";
    }
  }

  function renderReview() {
    if (!reviewState) startReview();
    if (reviewState.finished) { renderReviewResult(); return; }
    const entry = reviewState.questions[reviewState.index];
    const unit = unitById(entry.unitId);
    const item = entry.item;
    app.innerHTML = `<div class="review-head"><div><p class="eyebrow">9単元のテスト対策</p><h1>まとめチェック</h1><p>各単元の中心を1問ずつ確かめます。</p></div><b>${reviewState.index + 1} / ${reviewState.questions.length}</b></div>
      <article class="activity-card review-card" style="${unitStyle(unit)}">
        <span class="activity-count">${unit.icon} ${unit.title}</span><h2>${item.prompt || item.question}</h2>
        <div class="choices">${item.choices.map((choice,i)=>`<button class="choice" data-review-choice="${i}">${escapeHtml(choice)}</button>`).join("")}</div>
        <div class="answer-area"></div>
      </article>`;
    app.querySelectorAll("[data-review-choice]").forEach(button => button.addEventListener("click", event => {
      event.stopPropagation();
      answerReview(Number(button.dataset.reviewChoice));
    }));
  }

  function answerReview(choiceIndex) {
    if (!reviewState || reviewState.finished || reviewState.answered) return;
    const entry = reviewState.questions[reviewState.index];
    const item = entry.item;
    const correct = choiceIndex === item.answer;
    reviewState.answered = true;
    if (correct) reviewState.score += 1;
    else reviewState.misses.push(entry);

    app.querySelectorAll("[data-review-choice]").forEach((button, index) => {
      button.disabled = true;
      if (index === item.answer) button.classList.add("correct");
      if (index === choiceIndex && !correct) button.classList.add("wrong");
    });

    const answerArea = app.querySelector(".answer-area");
    answerArea.innerHTML = `<div class="feedback ${correct ? "correct" : "wrong"}"><b>${correct ? "正解！" : "もう一度考えよう"}</b>${escapeHtml(item.explanation)}</div><button class="primary-button review-next" data-review-next type="button">${reviewState.index < reviewState.questions.length - 1 ? "次の問題へ" : "結果を見る"}</button>`;
  }

  function startReview() {
    const pick = (items, count) => [...items].sort(() => Math.random() - .5).slice(0, Math.min(count, items.length));
    const questions = window.SCIENCE_UNITS.flatMap(unit => {
      const pool = [...(unit.knowledge || []), ...(unit.consideration || [])];
      return pick(pool, 1).map(item => ({ unitId: unit.id, item }));
    }).sort(() => Math.random() - .5);
    reviewState = { index: 0, score: 0, misses: [], finished: false, answered: false, questions };
  }
  function renderReviewResult() {
    const percent = Math.round(reviewState.score / reviewState.questions.length * 100);
    app.innerHTML = `<article class="activity-card review-card review-result">
      <p class="eyebrow">まとめチェック結果</p><div class="result-ring" style="--score:${percent}%"><b>${reviewState.score} / ${reviewState.questions.length}</b></div>
      <h1>${percent === 100 ? "全問正解！" : percent >= 70 ? "あと少しでばっちり！" : "まちがいは、伸びる場所。"}</h1>
      <p>${reviewState.misses.length ? "確かめたい単元へ戻って、証拠と説明をもう一度つなげよう。" : "9単元の中心がしっかりつながっています。"}</p>
      ${reviewState.misses.length ? `<div class="miss-list">${reviewState.misses.map(entry => { const unit=unitById(entry.unitId); return `<button class="miss-item text-button" data-unit="${unit.id}">${unit.icon} ${unit.title}：${escapeHtml(entry.item.prompt || entry.item.question)}</button>`; }).join("")}</div>` : ""}
      <div class="action-row"><button class="secondary-button" data-home>単元一覧へ</button><button class="primary-button" data-retry-review>もう一度</button></div>
    </article>`;
  }

  function playTone(correct) {
    if (!data.sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = correct ? 660 : 190;
      gain.gain.setValueAtTime(.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .16);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(); oscillator.stop(ctx.currentTime + .16);
    } catch (_) { /* 音が使えなくても学習は続けられる */ }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function loadLabRouter() {
    if (window.RikaLabRouter) return Promise.resolve(window.RikaLabRouter);
    if (labLoadPromise) return labLoadPromise;
    labLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "labs/index.js";
      script.onload = () => window.RikaLabRouter ? resolve(window.RikaLabRouter) : reject(new Error("LABを読み込めませんでした"));
      script.onerror = () => reject(new Error("LABを読み込めませんでした"));
      document.head.append(script);
    });
    return labLoadPromise;
  }

  function renderLabRoute(route) {
    const token = ++labRenderToken;
    app.innerHTML = `<section class="lab-loading"><span class="lab-loading-mark" aria-hidden="true">⌛</span><h1>LABを準備しています</h1><p>実験道具を読み込んでいます。</p></section>`;
    loadLabRouter().then(async router => {
      if (token !== labRenderToken || !["lab", "lab-notebook"].includes(parseRoute().page)) return;
      await router.render(route, app, { routeTo, showToast, escapeHtml });
      app.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(() => {
      if (token !== labRenderToken) return;
      app.innerHTML = `<section class="empty-state"><h1>LABを読み込めませんでした</h1><p>通信を確認して、もう一度開いてください。これまでの問題と記録はそのままです。</p><button class="primary-button" type="button" data-open-labs>もう一度</button></section>`;
      labLoadPromise = null;
    });
  }

  function render() {
    const route = parseRoute();
    app.classList.toggle("lab-main", route.page === "lab" || route.page === "lab-notebook");
    if (route.page === "unit") renderUnit(route);
    else if (route.page === "review") renderReview();
    else if (route.page === "discoveries") app.innerHTML = window.ScienceGame?.catalog() || "";
    else if (route.page === "lab" || route.page === "lab-notebook") renderLabRoute(route);
    else renderHome();
    app.focus({ preventScroll: true }); const focusCard = document.querySelector(".activity-card"); if (focusCard) { const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0; const targetTop = focusCard.getBoundingClientRect().top + window.scrollY - headerHeight - 14; window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" }); } else { window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  document.addEventListener("click", event => {
    const target = event.target.closest("button");
    if (!target) return;
    const route = parseRoute();
    if (target.matches("[data-home]")) routeTo("");
    else if (target.matches("[data-open-labs], [data-lab-home]")) routeTo("lab");
    else if (target.matches("[data-lab-notebook]")) routeTo("lab/notebook");
    else if (target.dataset.labId) routeTo(`lab/${target.dataset.labId}`);
    else if (target.matches("[data-discoveries]")) routeTo("discoveries");
    else if (target.dataset.unit) routeTo(`unit/${target.dataset.unit}/knowledge/0`);
    else if (target.dataset.phase && route.page === "unit") routeTo(`unit/${route.unitId}/${target.dataset.phase}/0`);
    else if (target.dataset.index && route.page === "unit") routeTo(`unit/${route.unitId}/${route.phase}/${target.dataset.index}`);
    else if (target.matches("[data-choice]")) chooseAnswer(target);
    else if (target.matches("[data-card]")) selectSortCard(target);
    else if (target.dataset.bucket) assignCard(target.dataset.bucket);
    else if (target.dataset.unassign) unassignCard(Number(target.dataset.unassign));
    else if (target.matches("[data-check]")) checkAnswer();
    else if (target.matches("[data-retry-question]")) render();
    else if (target.matches("[data-review-next]")) {
      reviewState.answered = false;
      reviewState.index += 1;
      if (reviewState.index >= reviewState.questions.length) reviewState.finished = true;
      render();
    }
    else if (target.matches("[data-prev]") && route.page === "unit") routeTo(`unit/${route.unitId}/${route.phase}/${Math.max(0, route.index-1)}`);
    else if (target.dataset.next && route.page === "unit") routeTo(`unit/${route.unitId}/${route.phase}/${target.dataset.next}`);
    else if (target.dataset.nextBatch && route.page === "unit") routeTo(`unit/${route.unitId}/${route.phase}/0`);
    else if (target.dataset.nextPhase === "home") routeTo("");
    else if (target.dataset.nextPhase && route.page === "unit") routeTo(`unit/${route.unitId}/${target.dataset.nextPhase}/0`);
    else if (target.matches("[data-retry-review]")) { reviewState = null; renderReview(); }
  });

  document.querySelector("#homeButton").addEventListener("click", () => routeTo(""));
  document.querySelector("#labButton").addEventListener("click", () => routeTo("lab"));
  document.querySelector("#reviewButton").addEventListener("click", () => { reviewState = null; routeTo("review"); });
  document.querySelector("#settingsButton").addEventListener("click", () => { soundToggle.checked = data.sound; dialog.showModal(); });
  soundToggle.addEventListener("change", () => { data.sound = soundToggle.checked; save(); showToast(data.sound ? "効果音をオンにしました" : "効果音をオフにしました"); });
  document.querySelector("#resetButton").addEventListener("click", () => {
    if (!confirm("この端末に保存した問題の記録とLABノートを、すべて消しますか？")) return;
    data = defaultData();
    save();
    localStorage.removeItem("rikaLab6.notebook.v1");
    window.RikaLabRouter?.clearAll?.();
    dialog.close(); showToast("学習記録とLABノートを消しました"); render();
  });
  window.addEventListener("hashchange", render);
  render();
})();
