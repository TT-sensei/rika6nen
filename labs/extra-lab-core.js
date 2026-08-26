(() => {
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const many=(n,fn)=>Array.from({length:Math.max(0,Math.round(n))},(_,i)=>fn(i)).join("");
  const option=(key,label,value,items,show)=>({key,label,type:"options",value,items,show});
  const range=(key,label,min,max,value,unit="",show)=>({key,label,type:"range",min,max,value,unit,show});


  const metric=(label,value,note="")=>`<div class="instant-metric"><span>${esc(label)}</span><b>${esc(value)}</b>${note?`<small>${esc(note)}</small>`:""}</div>`;
  const frame=(title,body,caption)=>`<svg viewBox="0 0 900 500" class="extra-svg" role="img" aria-label="${esc(title)}">${body}<text x="32" y="42" class="scene-title">${esc(title)}</text><text x="450" y="465" text-anchor="middle" class="scene-caption">${esc(caption)}</text></svg>`;


  const registered = new Map();

  function register(id, spec, render) {
    registered.set(id, { spec, render });
  }

  function controls(spec,state){return spec.controls.filter(c=>!c.show||c.show(state)).map(c=>c.type==="options"?`<div class="instant-control"><b>${esc(c.label)}</b><div class="instant-options">${c.items.map(([v,label])=>`<button type="button" data-key="${c.key}" data-value="${esc(v)}" aria-pressed="${String(state[c.key])===String(v)}">${esc(label)}</button>`).join("")}</div></div>`:`<label class="instant-range"><span>${esc(c.label)} <output>${esc(state[c.key])}${esc(c.unit)}</output></span><input type="range" data-key="${c.key}" min="${c.min}" max="${c.max}" value="${state[c.key]}"></label>`).join("");}


  function mount(root,{manifest}){const entry=registered.get(manifest.id);if(!entry) throw new Error("Extra LAB not registered");const spec=entry.spec,state=Object.fromEntries(spec.controls.map(c=>[c.key,c.value]));let time=manifest.id==="burning"?5:0,running=false,raf=0,last=0;const timeActions=spec.time?`<button class="primary-button" data-run type="button">▶ 時間を進める</button><button class="secondary-button" data-step type="button">少し進める</button>`:"";root.innerHTML=`<nav class="breadcrumbs"><button class="text-button" type="button" data-lab-home>LAB一覧</button><span>›</span><span>${esc(manifest.title)}</span></nav><section class="science-lab instant-lab" style="--lab-accent:${manifest.accent}"><header class="lab-titlebar"><div><p class="eyebrow">${esc(manifest.unit)}</p><h1>${manifest.icon} ${esc(manifest.title)}</h1><p>条件を変えると、結果がすぐ変わります。気になる組み合わせを何度でも試そう。</p></div></header><div class="lab-workspace"><section class="simulation-column"><div class="sim-stage extra-stage" data-stage></div><div class="sim-readout extra-readout" data-results aria-live="polite"></div><div class="sim-actions">${timeActions}<button class="secondary-button" data-reset type="button">リセット</button></div></section><aside class="control-panel instant-panel"><div class="control-heading"><p class="eyebrow">CONDITION</p><h2>条件を変える</h2><p>ボタンやスライダーを動かすだけ。入力や保存はありません。</p></div><div data-controls></div><div class="instant-presets"><b>すぐ試す</b><div>${spec.presets.map((p,i)=>`<button type="button" data-preset="${i}">${esc(p[0])}</button>`).join("")}</div></div><div class="try-card"><b>見てみよう</b><p>${esc(spec.hint)}</p></div></aside></div><div class="lab-guide instant-result"><span>👀</span><p data-guide></p></div><p class="model-note"><b>モデルについて：</b>${esc(spec.model)}</p></section>`;const stage=root.querySelector("[data-stage]"),panel=root.querySelector("[data-controls]"),results=root.querySelector("[data-results]"),guide=root.querySelector("[data-guide]");const draw=()=>{panel.innerHTML=controls(spec,state);const d=entry.render(state,time);stage.innerHTML=d.svg;results.innerHTML=`<div class="extra-readout-grid">${d.results.join("")}</div>`;guide.textContent=d.message;};const reset=()=>{spec.controls.forEach(c=>state[c.key]=c.value);time=manifest.id==="burning"?5:0;running=false;last=0;const run=root.querySelector("[data-run]");if(run)run.textContent="▶ 時間を進める";draw();};const loop=stamp=>{if(!running)return;if(last)time+=Math.min(.2,(stamp-last)/1000);last=stamp;draw();raf=requestAnimationFrame(loop);};root.addEventListener("click",e=>{const o=e.target.closest("[data-key][data-value]");if(o){const c=spec.controls.find(x=>x.key===o.dataset.key);state[o.dataset.key]=typeof c.value==="number"?Number(o.dataset.value):o.dataset.value;draw();return;}const p=e.target.closest("[data-preset]");if(p){Object.assign(state,spec.presets[+p.dataset.preset][1]);time=manifest.id==="burning"?5:0;draw();return;}if(e.target.closest("[data-run]")){running=!running;e.target.closest("button").textContent=running?"⏸ 止める":"▶ 時間を進める";last=0;if(running)raf=requestAnimationFrame(loop);return;}if(e.target.closest("[data-step]")){time+=2;draw();return;}if(e.target.closest("[data-reset]"))reset();});root.addEventListener("input",e=>{const input=e.target.closest("input[data-key]");if(!input)return;state[input.dataset.key]=+input.value;draw();});draw();return()=>{running=false;cancelAnimationFrame(raf);};}

  window.RikaLabExtra = { clamp, esc, many, option, range, metric, frame, register, mount };
})();
