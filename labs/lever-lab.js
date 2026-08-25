(() => {
  "use strict";
  window.RikaLabSimulations = window.RikaLabSimulations || {};

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const initial = () => ({ pivot: 6, leftPos: 3, rightPos: 10, leftWeight: 2, rightWeight: 1, mode: "free", touched: false });

  function createLeverSimulation({ stage, controls, readout, guide, core }) {
    const state = initial();
    const controller = new AbortController();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = 900, H = 500, x0 = 100, x1 = 800, yBeam = 245, stepX = (x1-x0)/12;
    let currentAngle = 0, frame = 0, missionSolved = false;
    const px = position => x0 + position*stepX;
    const leftDistance = () => state.pivot-state.leftPos;
    const rightDistance = () => state.rightPos-state.pivot;
    const leftMoment = () => state.leftWeight*leftDistance();
    const rightMoment = () => state.rightWeight*rightDistance();
    const targetAngle = () => clamp((rightMoment()-leftMoment())*2.2, -14, 14);
    const relation = () => leftMoment() === rightMoment() ? "つり合っている" : leftMoment() > rightMoment() ? "左が下がる" : "右が下がる";

    stage.innerHTML = `<svg class="lever-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="leverTitle leverDesc">
      <title id="leverTitle">支点と左右のおもりを動かせるてこ</title><desc id="leverDesc">左右のおもりと支点からの距離に応じて、てこが傾きます。</desc>
      <defs><linearGradient id="beamWood" x1="0" x2="1"><stop stop-color="#e9b86d"/><stop offset=".5" stop-color="#f5d28d"/><stop offset="1" stop-color="#d99b4e"/></linearGradient><filter id="leverShadow"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-opacity=".2"/></filter></defs>
      <rect width="900" height="500" rx="22" fill="#f5f1e8"/>
      <g class="lab-grid-lines">${Array.from({length:13},(_,i)=>`<line x1="${px(i)}" y1="92" x2="${px(i)}" y2="385"/><text x="${px(i)}" y="417" text-anchor="middle">${i+1}</text>`).join("")}</g>
      <text x="42" y="45" class="svg-caption">おもり・支点をドラッグ</text>
      <g data-beam-group filter="url(#leverShadow)">
        <rect x="75" y="225" width="750" height="40" rx="13" fill="url(#beamWood)" stroke="#7d542d" stroke-width="4"/>
        ${Array.from({length:13},(_,i)=>`<line x1="${px(i)}" y1="226" x2="${px(i)}" y2="244" stroke="#79532f" stroke-width="3"/>`).join("")}
        <g data-weight-visual="left"></g><g data-weight-visual="right"></g>
      </g>
      <g data-pivot-visual><path d="M ${px(state.pivot)-40} 355 L ${px(state.pivot)} 260 L ${px(state.pivot)+40} 355 Z" fill="#4d6972" stroke="#24414a" stroke-width="4"/><circle cx="${px(state.pivot)}" cy="252" r="16" fill="#eaf1f3" stroke="#24414a" stroke-width="5"/></g>
      <g class="drag-hit" data-drag="left" role="slider" tabindex="0" aria-label="左のおもりの位置" aria-valuemin="1" aria-valuemax="6"><circle r="42" fill="transparent"/></g>
      <g class="drag-hit" data-drag="right" role="slider" tabindex="0" aria-label="右のおもりの位置" aria-valuemin="1" aria-valuemax="6"><circle r="42" fill="transparent"/></g>
      <g class="drag-hit pivot-hit" data-drag="pivot" role="slider" tabindex="0" aria-label="支点の位置" aria-valuemin="5" aria-valuemax="9"><circle r="34" fill="transparent"/></g>
    </svg>`;
    const svg = stage.querySelector("svg"), beamGroup = svg.querySelector("[data-beam-group]"), pivotVisual = svg.querySelector("[data-pivot-visual]");
    const control = new core.ControlPanel(controls);
    controls.insertAdjacentHTML("afterbegin", `<div class="control-heading"><p class="eyebrow">CONTROL</p><h2>条件を変える</h2><p>スライダーでも、図のドラッグでも動かせます。</p></div>`);
    const weightSection = control.section("おもり", "1こを同じ重さとして比べます");
    const leftWeightControl = control.range(weightSection, { label:"左のおもり", min:1, max:5, value:state.leftWeight, format:v=>`${v}こ`, onInput:value=>{state.leftWeight=value; changed("leftWeight");} });
    const rightWeightControl = control.range(weightSection, { label:"右のおもり", min:1, max:5, value:state.rightWeight, format:v=>`${v}こ`, onInput:value=>{state.rightWeight=value; changed("rightWeight");} });
    const distanceSection = control.section("支点と距離", "目盛り1つ分を距離1として表します");
    const leftDistanceControl = control.range(distanceSection, { label:"左の距離", min:1, max:6, value:leftDistance(), format:v=>`${v}`, onInput:value=>{state.leftPos=state.pivot-value; changed("leftPos");} });
    const rightDistanceControl = control.range(distanceSection, { label:"右の距離", min:1, max:6, value:rightDistance(), format:v=>`${v}`, onInput:value=>{state.rightPos=state.pivot+value; changed("rightPos");} });
    const pivotControl = control.range(distanceSection, { label:"支点の位置", min:4, max:8, value:state.pivot, format:v=>`目盛り${v+1}`, onInput:value=>movePivot(value) });
    controls.insertAdjacentHTML("beforeend", `<div class="try-card"><b>やってみよう</b><p>おもりの数を変えずに、距離だけを変えるとどうなる？</p></div>`);

    function discs(side) {
      const isLeft = side === "left", count = state[`${side}Weight`], x = px(state[`${side}Pos`]);
      const colors = isLeft ? ["#287aa0","#1d5d7c"] : ["#cc7047","#9d4930"];
      return `<line x1="${x}" y1="265" x2="${x}" y2="${305-count*6}" stroke="#34484d" stroke-width="5"/><g>${Array.from({length:count},(_,i)=>`<rect x="${x-27}" y="${304-i*18}" width="54" height="17" rx="8" fill="${colors[i%2]}" stroke="#173842" stroke-width="2"/>`).join("")}</g><text x="${x}" y="${340-count*2}" text-anchor="middle" class="weight-label">${count}こ</text>`;
    }
    function movePivot(next) {
      const leftD = leftDistance(), rightD = rightDistance();
      state.pivot = clamp(next, 4, 8);
      state.leftPos = clamp(state.pivot-leftD, 0, state.pivot-1);
      state.rightPos = clamp(state.pivot+rightD, state.pivot+1, 12);
      changed("pivot");
    }
    function updateControlLimits() {
      leftDistanceControl.input.max = Math.min(6,state.pivot);
      rightDistanceControl.input.max = Math.min(6,12-state.pivot);
      leftDistanceControl.set(leftDistance()); rightDistanceControl.set(rightDistance()); pivotControl.set(state.pivot);
      leftWeightControl.set(state.leftWeight); rightWeightControl.set(state.rightWeight);
    }
    function renderWeights() {
      svg.querySelector('[data-weight-visual="left"]').innerHTML = discs("left");
      svg.querySelector('[data-weight-visual="right"]').innerHTML = discs("right");
      svg.querySelector('[data-drag="left"]').setAttribute("transform",`translate(${px(state.leftPos)} 300)`);
      svg.querySelector('[data-drag="right"]').setAttribute("transform",`translate(${px(state.rightPos)} 300)`);
      svg.querySelector('[data-drag="pivot"]').setAttribute("transform",`translate(${px(state.pivot)} 260)`);
      svg.querySelector('[data-drag="left"]').setAttribute("aria-valuenow",leftDistance());
      svg.querySelector('[data-drag="right"]').setAttribute("aria-valuenow",rightDistance());
      svg.querySelector('[data-drag="pivot"]').setAttribute("aria-valuenow",state.pivot+1);
      pivotVisual.innerHTML = `<path d="M ${px(state.pivot)-40} 355 L ${px(state.pivot)} 260 L ${px(state.pivot)+40} 355 Z" fill="#4d6972" stroke="#24414a" stroke-width="4"/><circle cx="${px(state.pivot)}" cy="252" r="16" fill="#eaf1f3" stroke="#24414a" stroke-width="5"/>`;
    }
    function renderReadout() {
      const balanced = leftMoment() === rightMoment();
      readout.innerHTML = `<div class="moment-card left"><span>左側</span><b><i>${state.leftWeight}こ</i> × <i>距離 ${leftDistance()}</i></b><strong>${leftMoment()}</strong></div><div class="balance-status ${balanced?"balanced":""}"><span aria-hidden="true">${balanced?"●":"↔"}</span><b>${relation()}</b>${state.mode==="mission"?`<small>${balanced?"見つけた！":"右のおもりを動かそう"}</small>`:""}</div><div class="moment-card right"><span>右側</span><b><i>${state.rightWeight}こ</i> × <i>距離 ${rightDistance()}</i></b><strong>${rightMoment()}</strong></div>`;
      if (state.mode === "mission" && balanced && !missionSolved && state.touched) { missionSolved=true; guide("つり合う場所を発見！別の重さでも同じきまりになるかな？"); }
    }
    function animate() {
      const target = targetAngle();
      currentAngle = reduced ? target : currentAngle + (target-currentAngle)*.16;
      beamGroup.setAttribute("transform",`rotate(${currentAngle} ${px(state.pivot)} ${yBeam})`);
      if (Math.abs(target-currentAngle)>.05) frame=requestAnimationFrame(animate); else frame=0;
    }
    function changed(source) {
      state.touched = true;
      if (source !== "pivot") {
        state.leftPos = clamp(state.leftPos, 0, state.pivot-1);
        state.rightPos = clamp(state.rightPos, state.pivot+1, 12);
      }
      updateControlLimits(); renderWeights(); renderReadout();
      if (!frame) frame=requestAnimationFrame(animate);
    }
    function reset() { Object.assign(state, initial()); missionSolved=false; currentAngle=0; changed("reset"); state.touched=false; guide("重さと距離のどちらが、てこの傾きに関係しているかな？"); }
    function setMode(mode) {
      state.mode=mode; missionSolved=false;
      if (mode === "mission") {
        const missions = [[2,3,3,2],[1,4,2,2],[3,2,2,3],[2,4,4,2]];
        const [lw,ld,rw,rd] = missions[Math.floor(Math.random()*missions.length)];
        state.pivot=6; state.leftWeight=lw; state.leftPos=6-ld; state.rightWeight=rw; state.rightPos=6+clamp(rd+(Math.random()<.5?1:-1),1,6); state.touched=false;
      } else Object.assign(state, initial());
      changed("mode"); state.touched=false;
    }
    function step() { const next = rightDistance() >= Math.min(6,12-state.pivot) ? 1 : rightDistance()+1; state.rightPos=state.pivot+next; changed("rightPos"); }

    let dragging = null;
    svg.addEventListener("pointerdown", event => {
      const hit = event.target.closest("[data-drag]"); if (!hit) return;
      dragging = hit.dataset.drag; hit.setPointerCapture?.(event.pointerId); event.preventDefault();
    }, { signal:controller.signal });
    svg.addEventListener("pointermove", event => {
      if (!dragging) return;
      const point = svg.createSVGPoint(); point.x=event.clientX; point.y=event.clientY;
      const local = point.matrixTransform(svg.getScreenCTM().inverse());
      const pos = Math.round((local.x-x0)/stepX);
      if (dragging === "pivot") movePivot(clamp(pos,4,8));
      else if (dragging === "left") { state.leftPos=clamp(pos,0,state.pivot-1); changed("leftPos"); }
      else { state.rightPos=clamp(pos,state.pivot+1,12); changed("rightPos"); }
    }, { signal:controller.signal });
    const stopDrag = () => { dragging=null; };
    svg.addEventListener("pointerup",stopDrag,{signal:controller.signal}); svg.addEventListener("pointercancel",stopDrag,{signal:controller.signal});
    svg.addEventListener("keydown", event => {
      const hit=event.target.closest("[data-drag]"); if (!hit || !["ArrowLeft","ArrowRight"].includes(event.key)) return;
      event.preventDefault(); const delta=event.key==="ArrowRight"?1:-1;
      if(hit.dataset.drag==="pivot") movePivot(state.pivot+delta);
      else if(hit.dataset.drag==="left"){state.leftPos=clamp(state.leftPos+delta,0,state.pivot-1);changed("leftPos");}
      else{state.rightPos=clamp(state.rightPos+delta,state.pivot+1,12);changed("rightPos");}
    },{signal:controller.signal});

    renderWeights(); updateControlLimits(); renderReadout(); animate();
    return {
      reset, step, setMode,
      getSnapshot: () => ({
        conditions:{"支点の位置":`目盛り${state.pivot+1}`,"左のおもり":`${state.leftWeight}こ`,"左の距離":leftDistance(),"右のおもり":`${state.rightWeight}こ`,"右の距離":rightDistance()},
        result:{"てこのようす":relation(),"左のはたらき":leftMoment(),"右のはたらき":rightMoment()},
        metrics:{leftMoment:leftMoment(),rightMoment:rightMoment()}, graphData:null
      }),
      destroy(){controller.abort();if(frame)cancelAnimationFrame(frame);}
    };
  }

  window.RikaLabSimulations.lever = {
    mount(root, { core, host, manifest: base }) {
      const manifest = { ...base,
        modeLabel:"つり合う場所を探す", missionPrompt:"右のおもりの位置を動かして、てこが水平になる場所を探そう。",
        modelNote:"おもり1こを同じ重さ、目盛り1つ分を同じ距離として表しています。棒の重さや支点の摩擦は扱いません。",
        predictionChoices:["重い方がいつも下がる","支点から遠い方が下がりやすい","重さと距離の両方が関係する"],
        graph(records){return {type:"groupedBar",labels:records.map((_,i)=>`実験${i+1}`),series:[{label:"左のはたらき",color:"#287aa0",values:records.map(r=>Number(r.metrics.leftMoment)||0)},{label:"右のはたらき",color:"#cc7047",values:records.map(r=>Number(r.metrics.rightMoment)||0)}],unit:"重さ×距離",ariaLabel:"左右のてこのはたらきを比べる棒グラフ"};}
      };
      const lab = new core.ScienceLab({ root, manifest, host, buildSimulation: args => createLeverSimulation({...args,core}) });
      return lab.mount();
    }
  };
})();
