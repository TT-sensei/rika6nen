(() => {
  "use strict";
  window.RikaLabSimulations = window.RikaLabSimulations || {};
  const KEY = "rikaLab6.burning.v1";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const many = (n, fn) => Array.from({length:n}, (_, i) => fn(i)).join("");
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v?.records) ? v.records : []; } catch (_) { return []; } };
  const write = records => { try { localStorage.setItem(KEY, JSON.stringify({version:1, records:records.slice(0,12)})); } catch (_) {} };
  const initial = () => ({ covered:false, jarX:700, bottomGap:false, topGap:false, lit:false, time:0, oxygen:21, co2:0.04, beforeOxygen:21, beforeCo2:0.04, flow:false, inside:false, speed:1, sample:"after", lime:false, shaken:false });

  function model(s, dt = 0) {
    if (s.lit) {
      const exchange = s.covered ? (s.bottomGap ? .42 : 0) + (s.topGap ? .38 : 0) : 1;
      const burnPower = clamp((s.oxygen - 7) / 14, 0, 1) * (.55 + exchange * .45);
      const consumed = .23 * burnPower * dt;
      const supplied = exchange * .32 * (21 - s.oxygen) / 21 * dt;
      s.oxygen = clamp(s.oxygen - consumed + supplied, 0, 21);
      s.co2 = clamp(s.co2 + consumed * .8, .04, 18);
      s.time += dt;
      if (s.oxygen < 7 || burnPower < .08) s.lit = false;
    }
    const exchange = s.covered ? (s.bottomGap ? .42 : 0) + (s.topGap ? .38 : 0) : 1;
    const flame = s.lit ? clamp((s.oxygen - 7) / 14, 0, 1) * (.55 + exchange * .45) : 0;
    return {exchange, flame};
  }

  function gasParticles(s) {
    if (!s.inside) return "";
    const oxygenN = Math.round(s.oxygen / 2.1), co2N = Math.round(s.co2 / 1.5);
    return `<g class="gas-model"><text x="270" y="102" class="gas-title">空気の中を見る（学習用モデル）</text>${many(10, i => `<circle class="gas-other" cx="${275+(i*67)%350}" cy="${130+(i*43)%190}" r="4"/>`)}${many(oxygenN, i => `<circle class="gas-oxygen" cx="${285+(i*53)%330}" cy="${135+(i*71)%180}" r="5"/>`)}${many(co2N, i => `<circle class="gas-co2" cx="${300+(i*79)%300}" cy="${145+(i*31)%165}" r="6"/>`)}</g>`;
  }

  function airflow(s) {
    if (!s.flow || !s.covered) return "";
    const inFlow = s.bottomGap ? many(4, i => `<path class="air-in" d="M${300+i*45} 420q0-75 42-126" style="--delay:${i*.2}s"/>`) : "";
    const outFlow = s.topGap ? many(4, i => `<path class="air-out" d="M${500+i*27} 115q35-45 50-78" style="--delay:${i*.2}s"/>`) : "";
    return `<g class="airflow"><text x="610" y="90" class="flow-label">空気の流れ</text>${inFlow}${outFlow}</g>`;
  }

  function scene(s, m) {
    const flameH = 35 + m.flame * 105, flameW = 22 + m.flame * 24;
    const jar = `<g data-action="jar" class="jar" transform="translate(${s.jarX-450} 0)" opacity="${s.covered?1:.72}"><path d="M270 100h360v300q0 35-35 35H305q-35 0-35-35z" fill="#b9e0e8" fill-opacity=".28" stroke="#518696" stroke-width="7"/><path d="M270 100h360" stroke="#518696" stroke-width="9"/><text x="450" y="440" text-anchor="middle" class="scene-label">集気びん</text></g>`;
    const bottom = s.bottomGap ? `<path d="M295 398h70M535 398h70" stroke="#d26b42" stroke-width="10" stroke-linecap="round"/>` : "";
    const top = s.topGap ? `<path d="M300 100h70M530 100h70" stroke="#d26b42" stroke-width="10" stroke-linecap="round"/>` : "";
    const flame = s.lit ? `<path class="burn-flame" d="M450 ${355-flameH}c-${flameW} ${flameH*.42} -${flameW*.45} ${flameH*.82} 0 ${flameH} ${flameW*.45}-${flameH*.18} ${flameW}-.58 0-${flameH}z"/>` : `<path class="cold-flame" d="M450 350c-12-18 10-30 6-50 22 20 20 37 8 50z"/>`;
    return `<svg class="burning-svg" viewBox="0 0 900 520" role="img" aria-label="燃焼実験台"><defs><linearGradient id="jarAir" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#d8f0f4" stop-opacity=".8"/><stop offset="1" stop-color="#aad5df" stop-opacity=".45"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="900" height="520" fill="#f1f7f5"/><text x="32" y="42" class="scene-title">燃焼実験台</text><path d="M120 410h660" stroke="#805a42" stroke-width="14"/><path d="M155 410v55M745 410v55" stroke="#805a42" stroke-width="12"/><text x="132" y="495" class="scene-note">集気びんをろうそくに近づける</text><g class="candle"><rect x="418" y="285" width="64" height="125" rx="13" fill="#fff7df" stroke="#a78f66" stroke-width="4"/><path d="M450 285v-24" stroke="#4b4037" stroke-width="5"/>${flame}</g>${jar}${bottom}${top}${airflow(s)}${gasParticles(s)}<g data-action="lighter" class="lighter"><rect x="710" y="305" width="34" height="90" rx="12" fill="#d77a46" stroke="#87452d" stroke-width="4"/><path d="M727 305v-26" stroke="#87452d" stroke-width="6"/><text x="680" y="430" class="scene-label">点火器具</text></g><g data-action="cover" class="cover-handle"><path d="M420 80h60" stroke="#6d8991" stroke-width="12" stroke-linecap="round"/><text x="450" y="68" text-anchor="middle" class="tap-label">ふたを${s.topGap ? "調整" : "タップ"}</text></g><text x="450" y="475" text-anchor="middle" class="scene-caption">${s.lit ? (m.flame < .18 ? "炎が消えそうです" : "燃焼中") : (s.time ? "炎が消えました。条件を変えて再実験できます" : "点火器具をタップして火をつけよう")}</text></svg>`;
  }

  function controls(s) {
    return `<div class="burn-control-grid"><button type="button" data-action="cover">${s.covered ? "集気びんを外す" : "集気びんをかぶせる"}</button><button type="button" data-action="bottom">下のすき間：${s.bottomGap ? "あり" : "なし"}</button><button type="button" data-action="top">上の出口：${s.topGap ? "あり" : "なし"}</button><button type="button" data-action="lighter">${s.lit ? "燃焼を止める" : "点火する"}</button></div><label class="burn-toggle"><input type="checkbox" data-toggle="flow" ${s.flow?"checked":""}> 空気の流れを見る</label><label class="burn-toggle"><input type="checkbox" data-toggle="inside" ${s.inside?"checked":""}> 🔍 空気の中を見る</label><div class="burn-speed"><b>時間の速さ</b><button type="button" data-speed=".25">🐢 ×0.25</button><button type="button" data-speed="1">▶ ×1</button><button type="button" data-speed="2">▶▶ ×2</button></div>`;
  }

  function card(s,m) { return `<div class="burn-metrics"><div><span>酸素</span><b>${s.oxygen.toFixed(1)}%</b><small>${s.oxygen > 17 ? "多い" : s.oxygen > 9 ? "減っている" : "少ない"}</small></div><div><span>二酸化炭素</span><b>${s.co2.toFixed(1)}%</b><small>${s.co2 > .5 ? "増えている" : "少ない"}</small></div><div><span>燃焼時間</span><b>${s.time.toFixed(1)}秒</b><small>${s.lit ? "燃焼中" : s.time ? "消火" : "未実験"}</small></div></div><div class="burn-bars"><span>酸素</span><i><em style="width:${s.oxygen/21*100}%"></em></i><span>二酸化炭素</span><i class="co2"><em style="width:${clamp(s.co2/18*100,0,100)}%"></em></i></div>`; }

  function gasLab(s) {
    const selected = s.sample === "before" ? {o:s.beforeOxygen,c:s.beforeCo2} : {o:s.oxygen,c:s.co2};
    const result = s.shaken && s.lime ? (selected.c > .5 ? "白くにごった" : "大きな変化はない") : "まだ検査していない";
    return `<section class="gas-test"><div class="burn-subhead"><div><p class="eyebrow">GAS TEST</p><h2>燃焼後の気体を調べる</h2><p>採取した気体に石灰水を入れて、振って観察します。</p></div><span class="simulation-badge">これはシミュレーションです</span></div><div class="gas-tabs"><button type="button" data-sample="before" aria-pressed="${s.sample==='before'}">燃焼前の空気</button><button type="button" data-sample="after" aria-pressed="${s.sample==='after'}">燃焼後の空気</button></div><div class="test-tube"><div class="tube-liquid ${s.shaken&&s.lime&&selected.c>.5?'cloudy':''}"></div><span>${result}</span></div><div class="gas-actions"><button type="button" data-gas="collect">気体を採取</button><button type="button" data-gas="lime">石灰水を入れる</button><button type="button" data-gas="shake">試験管を振る</button></div><p class="gas-hint">${s.shaken&&s.lime ? "結果を見て、燃焼前と後を比べてみよう。" : "順番に操作して、変化を観察しよう。"}</p></section>`;
  }

  function records(s) {
    const arr=read(); if(!arr.length)return `<div class="empty-burn-record">まだ記録はありません。「この状態を記録」で実験を残そう。</div>`;
    return `<div class="burn-record-grid">${arr.slice(0,3).map((r,i)=>`<article><b>実験${arr.length-i}</b><small>${esc(r.label)}</small><dl><dt>ふた</dt><dd>${r.covered?'あり':'なし'}</dd><dt>下のすき間</dt><dd>${r.bottomGap?'あり':'なし'}</dd><dt>上の出口</dt><dd>${r.topGap?'あり':'なし'}</dd><dt>燃焼時間</dt><dd>${Number(r.time).toFixed(1)}秒</dd><dt>気体</dt><dd>酸素 ${Number(r.oxygen).toFixed(1)}%</dd></dl></article>`).join("")}</div>`;
  }

  function mount(root,{manifest}) {
    const s=initial(); let running=false, raf=0, prediction="", thought="";
    root.innerHTML=`<nav class="breadcrumbs"><button class="text-button" type="button" data-lab-home>LAB一覧</button><span>›</span><span>燃焼LAB</span></nav><section class="burning-lab" style="--lab-accent:${manifest.accent}"><header class="burn-title"><div><p class="eyebrow">ものの燃え方と空気</p><h1>🔥 燃焼LAB</h1><p>器具を動かし、火をつけ、燃える前と後の空気を比べよう。</p></div><div class="burn-mission"><label>探究ミッション<select data-mission><option value="free">自由実験</option><option>ろうそくを長く燃やそう</option><option>空気の入口は必要？</option><option>出口も必要？</option><option>燃える前と後を比べよう</option></select></label></div></header><div class="burn-workspace"><section class="burn-stage-wrap"><div class="burn-stage" data-stage></div><div class="burn-readout" data-readout></div><div class="burn-actions"><button class="primary-button" data-run type="button">▶ 実験を動かす</button><button class="secondary-button" data-step type="button">1秒進める</button><button class="secondary-button" data-reset type="button">リセット</button></div></section><aside class="burn-panel"><div class="burn-panel-head"><p class="eyebrow">CONTROL</p><h2>実験器具を操作</h2><p>図の器具をタップしても操作できます。</p></div><div data-controls></div><div class="burn-try"><b>やってみよう</b><p data-prompt>集気びんをかぶせると、炎はどうなるかな？</p></div></aside></div><section class="burn-inquiry"><div class="burn-subhead"><div><p class="eyebrow">PREDICTION</p><h2>実験前の予想</h2><p>予想と違っても大丈夫。もう一度条件を変えて試そう。</p></div></div><div class="prediction-buttons"><button data-prediction="そのまま燃える">🔥 そのまま燃える</button><button data-prediction="少し燃えて消える">🔥 少し燃えて消える</button><button data-prediction="すぐ消える">🔥 すぐ消える</button></div><textarea data-thought rows="2" placeholder="自分の予想を短く書く（任意）"></textarea></section><div data-gas-slot>${gasLab(s)}</div><section class="burn-records"><div class="burn-subhead"><div><p class="eyebrow">COMPARE</p><h2>実験比較ボード</h2><p>条件を変えた実験を並べて、違いを見つけよう。</p></div><button class="primary-button" type="button" data-record>この状態を記録</button></div><div data-records>${records(s)}</div><label class="burn-thought"><span>考察メモ</span><textarea data-consideration rows="3" placeholder="実験を比べると、空気の入れ替わりと燃焼には…"></textarea></label></section><div class="burn-guide"><span>🔎</span><p data-guide>まずは集気びんをかぶせて、炎の変化を見てみよう。</p></div></section>`;
    const stage=root.querySelector('[data-stage]'), readout=root.querySelector('[data-readout]'), ctl=root.querySelector('[data-controls]');
    let draggingJar=false;
    const draw=()=>{const m=model(s,0);stage.innerHTML=scene(s,m);readout.innerHTML=card(s,m);ctl.innerHTML=controls(s);root.querySelector('[data-gas-slot]').innerHTML=gasLab(s);};
    const update=dt=>{model(s,dt);draw();};
    const loop=()=>{if(!running)return;update(.08*s.speed);raf=requestAnimationFrame(loop);};
    const setGuide=t=>{const el=root.querySelector('[data-guide]');if(el)el.textContent=t;};
    root.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='cover'){s.covered=!s.covered;s.jarX=s.covered?450:700;}if(a==='bottom')s.bottomGap=!s.bottomGap;if(a==='top')s.topGap=!s.topGap;if(a==='lighter')s.lit=!s.lit;if(e.target.matches('[data-run]')){running=!running;e.target.textContent=running?'⏸ 実験を止める':'▶ 実験を動かす';if(running)loop();}if(e.target.matches('[data-step]'))update(1);if(e.target.matches('[data-reset]')){Object.assign(s,initial());running=false;root.querySelector('[data-run]').textContent='▶ 実験を動かす';draw();}if(e.target.matches('[data-speed]'))s.speed=Number(e.target.dataset.speed);if(e.target.matches('[data-prediction]')){prediction=e.target.dataset.prediction;root.querySelectorAll('[data-prediction]').forEach(b=>b.setAttribute('aria-pressed',String(b===e.target)));setGuide('予想を残したね。条件を変えて実験してみよう。');}if(e.target.matches('[data-sample]')){s.sample=e.target.dataset.sample;draw();}if(e.target.matches('[data-gas]')){if(e.target.dataset.gas==='lime')s.lime=true;if(e.target.dataset.gas==='shake')s.shaken=true;draw();}if(e.target.matches('[data-record]')){const arr=read();arr.unshift({...s,label:prediction||'自由実験',consideration:root.querySelector('[data-consideration]').value});write(arr);root.querySelector('[data-records]').innerHTML=records(s);setGuide('実験を記録したね。条件を一つだけ変えて比べよう。');}});
    root.addEventListener('change',e=>{if(e.target.matches('[data-toggle]'))s[e.target.dataset.toggle]=e.target.checked;if(e.target.matches('[data-mission]'))setGuide(e.target.value==='free'?'好きな条件で自由に実験しよう。':e.target.value);draw();});
    root.addEventListener('pointerdown',e=>{if(e.target.closest('[data-action="jar"]')){draggingJar=true;e.target.setPointerCapture?.(e.pointerId);e.preventDefault();}});
    root.addEventListener('pointermove',e=>{if(!draggingJar)return;const svg=stage.querySelector('svg'),rect=svg?.getBoundingClientRect();if(!rect)return;s.jarX=clamp((e.clientX-rect.left)/rect.width*900,450,760);s.covered=s.jarX<560;draw();});
    root.addEventListener('pointerup',()=>{draggingJar=false;});
    root.addEventListener('input',e=>{if(e.target.matches('[data-thought]'))prediction=e.target.value;});
    draw(); return()=>{running=false;cancelAnimationFrame(raf);};
  }
  window.RikaLabSimulations.burning={mount};
})();
