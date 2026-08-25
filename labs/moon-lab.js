(() => {
  "use strict";
  window.RikaLabSimulations = window.RikaLabSimulations || {};

  const TAU = Math.PI*2;
  const normalize = angle => (angle%TAU+TAU)%TAU;
  const deg = angle => normalize(angle)*180/Math.PI;
  const initial = () => ({ angle:Math.PI/4, showNames:true, running:false, mode:"free", target:null, touched:false });

  function phaseInfo(angle) {
    const d=deg(angle), lit=Math.round(((1-Math.cos(angle))/2)*100);
    let key, name;
    if(d<22.5||d>=337.5){key="new";name="新月";}
    else if(d<67.5){key="crescent";name="三日月（満ちていく月）";}
    else if(d<112.5){key="first";name="半月（上弦の月）";}
    else if(d<157.5){key="waxing";name="満ちていく月";}
    else if(d<202.5){key="full";name="満月";}
    else if(d<247.5){key="waning";name="欠けていく月";}
    else if(d<292.5){key="last";name="半月（下弦の月）";}
    else{key="waning-crescent";name="欠けていく月";}
    return {key,name,lit};
  }
  function positionName(angle) {
    const d=deg(angle);
    if(d<30||d>330)return "太陽と同じ側";
    if(d>150&&d<210)return "太陽と反対側";
    if(d>=30&&d<=150)return "地球の上側";
    return "地球の下側";
  }

  function createMoonSimulation({stage,controls,readout,guide,core}) {
    const state=initial(), controller=new AbortController();
    const W=900,H=520,cx=330,cy=255,orbitR=175,sunX=785,sunY=255;
    let frame=0,lastTime=0,missionSolved=false;
    stage.innerHTML=`<svg class="moon-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="moonTitle moonDesc">
      <title id="moonTitle">太陽・地球・月の位置関係と地球から見える月</title><desc id="moonDesc">月を地球の周りで動かすと、地球から見える明るい部分が同時に変化します。</desc>
      <defs><radialGradient id="spaceBg"><stop stop-color="#26375f"/><stop offset="1" stop-color="#091225"/></radialGradient><radialGradient id="sunGlow"><stop stop-color="#fff6b0"/><stop offset=".35" stop-color="#ffd24c"/><stop offset="1" stop-color="#e89320"/></radialGradient><clipPath id="phaseDisc"><circle cx="720" cy="272" r="102"/></clipPath></defs>
      <rect width="900" height="520" rx="22" fill="url(#spaceBg)"/>
      <g class="stars">${Array.from({length:45},(_,i)=>`<circle cx="${20+(i*137)%850}" cy="${18+(i*83)%470}" r="${i%4===0?2:1}"/>`).join("")}</g>
      <line x1="600" y1="40" x2="600" y2="480" stroke="rgba(255,255,255,.16)" stroke-width="2"/>
      <text x="32" y="42" class="space-label">宇宙から見た位置関係</text><text x="630" y="42" class="space-label">地球から見える月</text>
      <g class="sun-rays">${Array.from({length:7},(_,i)=>`<line x1="${sunX-70}" y1="${95+i*53}" x2="575" y2="${95+i*53}"/>`).join("")}</g>
      <circle cx="${sunX}" cy="${sunY}" r="62" fill="url(#sunGlow)"/><text x="${sunX}" y="${sunY+92}" text-anchor="middle" class="object-label">太陽</text>
      <circle cx="${cx}" cy="${cy}" r="${orbitR}" fill="none" stroke="rgba(206,220,255,.35)" stroke-width="3" stroke-dasharray="8 10" data-orbit/>
      <g data-earth><circle cx="${cx}" cy="${cy}" r="46" fill="#2f8ac2" stroke="#bfe9ff" stroke-width="3"/><path d="M300 236q24-28 44-9t27 2q-2 22-18 28t-6 29q-32 13-51-12t4-38" fill="#68a95a"/><path d="M330 209A46 46 0 0 1 330 301Z" fill="rgba(255,255,255,.12)"/><text x="${cx}" y="${cy+72}" text-anchor="middle" class="object-label">地球</text></g>
      <g data-moon role="slider" tabindex="0" aria-label="月の位置" aria-valuemin="0" aria-valuemax="360"><circle r="25" fill="#273249" stroke="#dfe7f2" stroke-width="2"/><path d="M0-25A25 25 0 0 1 0 25L0-25Z" fill="#eef1e8"/><circle r="43" fill="transparent" class="moon-hit"/></g>
      <g data-phase-view clip-path="url(#phaseDisc)"><circle cx="720" cy="272" r="102" fill="#182034"/><path data-lit-half/><ellipse data-terminator cx="720" cy="272" ry="102"/></g><circle cx="720" cy="272" r="102" fill="none" stroke="#eef3ff" stroke-width="3"/>
      <text x="720" y="418" text-anchor="middle" class="phase-name" data-phase-name></text><text x="720" y="448" text-anchor="middle" class="phase-percent" data-phase-percent></text>
      <text x="330" y="493" text-anchor="middle" class="drag-hint">月をドラッグ／軌道をタップ</text>
    </svg>`;
    const svg=stage.querySelector("svg"),moon=svg.querySelector("[data-moon]"),half=svg.querySelector("[data-lit-half]"),terminator=svg.querySelector("[data-terminator]");
    const control=new core.ControlPanel(controls);
    controls.insertAdjacentHTML("afterbegin",`<div class="control-heading"><p class="eyebrow">CONTROL</p><h2>月を動かす</h2><p>宇宙からの見え方と、地球からの見え方を同時に見よう。</p></div>`);
    const positionSection=control.section("月の位置","スライダーでも図でも動かせます");
    const angleControl=control.range(positionSection,{label:"地球のまわり",min:0,max:360,step:1,value:deg(state.angle),format:value=>positionName(value*Math.PI/180),onInput:value=>{state.angle=value*Math.PI/180;changed();}});
    const displaySection=control.section("表示","");
    const namesControl=control.segmented(displaySection,{label:"月の名前",options:[{label:"表示する",value:"on"},{label:"かくす",value:"off"}],value:"on",onChange:value=>{state.showNames=value==="on";render();}});
    const runWrap=document.createElement("div");runWrap.className="run-controls";runWrap.innerHTML=`<button type="button" class="primary-button" data-run>▶ 動かす</button><button type="button" class="secondary-button" data-jump="0">新月の位置</button><button type="button" class="secondary-button" data-jump="180">満月の位置</button>`;displaySection.append(runWrap);
    controls.insertAdjacentHTML("beforeend",`<div class="try-card"><b>やってみよう</b><p>月はいつも半分が太陽に照らされています。見える形が変わるのはなぜ？</p></div>`);

    function drawPhaseDisc(){
      const waxing=Math.sin(state.angle)>=0, cos=Math.cos(state.angle), x=720,y=272,r=102;
      half.setAttribute("d",waxing?`M${x} ${y-r}A${r} ${r} 0 0 1 ${x} ${y+r}L${x} ${y-r}Z`:`M${x} ${y-r}A${r} ${r} 0 0 0 ${x} ${y+r}L${x} ${y-r}Z`);
      half.setAttribute("fill","#eef1e8");
      terminator.setAttribute("rx",String(Math.max(.01,Math.abs(cos)*r)));
      terminator.setAttribute("fill",cos>0?"#182034":"#eef1e8");
      terminator.style.display=Math.abs(cos)<.01?"none":"";
    }
    function render(){
      state.angle=normalize(state.angle); const mx=cx+Math.cos(state.angle)*orbitR,my=cy-Math.sin(state.angle)*orbitR,info=phaseInfo(state.angle);
      moon.setAttribute("transform",`translate(${mx} ${my})`);moon.setAttribute("aria-valuenow",String(Math.round(deg(state.angle))));moon.setAttribute("aria-valuetext",`${positionName(state.angle)}、${info.name}`);
      drawPhaseDisc();
      svg.querySelector("[data-phase-name]").textContent=state.showNames?info.name:"月の名前：？";
      svg.querySelector("[data-phase-percent]").textContent=`明るく見える部分　約 ${info.lit}%`;
      angleControl.set(Math.round(deg(state.angle)));namesControl.set(state.showNames?"on":"off");
      readout.innerHTML=`<div class="moon-readout-card"><span>月の位置</span><b>${positionName(state.angle)}</b></div><div class="moon-arrow" aria-hidden="true">→</div><div class="moon-readout-card phase"><span>地球から見える形</span><b>${state.showNames?info.name:"名前をかくしています"}</b><strong>約 ${info.lit}% が明るい</strong></div>${state.mode==="mission"?`<div class="moon-mission ${info.key===state.target?"solved":""}"><span>探す月</span><b>${targetName(state.target)}</b><small>${info.key===state.target?"見つけた！":"月を動かそう"}</small></div>`:""}`;
      if(state.mode==="mission"&&info.key===state.target&&state.touched&&!missionSolved){missionSolved=true;guide("指定された月を発見！宇宙から見た位置関係も記録しておこう。");}
    }
    function targetName(key){return {new:"新月",crescent:"三日月",first:"半月（上弦）",full:"満月",last:"半月（下弦）"}[key]||"月";}
    function changed(){state.touched=true;render();}
    function reset(){Object.assign(state,initial());missionSolved=false;lastTime=0;stop();render();guide("月を地球の周りで動かし、右の月の形を見てみよう。");}
    function step(){state.angle+=Math.PI/4;changed();}
    function stop(){state.running=false;const button=controls.querySelector("[data-run]");if(button)button.textContent="▶ 動かす";if(frame)cancelAnimationFrame(frame);frame=0;}
    function tick(time){if(!state.running)return;if(lastTime){state.angle+=Math.min(.05,(time-lastTime)/1000*.42);render();}lastTime=time;frame=requestAnimationFrame(tick);}
    function toggleRun(){state.running=!state.running;controls.querySelector("[data-run]").textContent=state.running?"Ⅱ 止める":"▶ 動かす";if(state.running){lastTime=0;frame=requestAnimationFrame(tick);}else stop();}
    function setMode(mode){state.mode=mode;missionSolved=false;state.touched=false;if(mode==="mission"){const targets=["new","crescent","first","full","last"];state.target=targets[Math.floor(Math.random()*targets.length)];state.angle=3*Math.PI/2;}else{state.target=null;state.angle=Math.PI/4;}stop();render();}

    let dragging=false;
    function angleFromEvent(event){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());return normalize(Math.atan2(cy-local.y,local.x-cx));}
    svg.addEventListener("pointerdown",event=>{const onMoon=event.target.closest("[data-moon]"),onOrbit=event.target.closest("[data-orbit]");if(!onMoon&&!onOrbit)return;dragging=!!onMoon;if(onMoon)onMoon.setPointerCapture?.(event.pointerId);state.angle=angleFromEvent(event);changed();event.preventDefault();},{signal:controller.signal});
    svg.addEventListener("pointermove",event=>{if(!dragging)return;state.angle=angleFromEvent(event);changed();},{signal:controller.signal});
    const end=()=>{dragging=false;};svg.addEventListener("pointerup",end,{signal:controller.signal});svg.addEventListener("pointercancel",end,{signal:controller.signal});
    moon.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();state.angle+=(event.key==="ArrowLeft"?-1:1)*Math.PI/36;changed();},{signal:controller.signal});
    controls.addEventListener("click",event=>{const run=event.target.closest("[data-run]"),jump=event.target.closest("[data-jump]");if(run)toggleRun();if(jump){state.angle=Number(jump.dataset.jump)*Math.PI/180;changed();}},{signal:controller.signal});
    render();
    return {reset,step,setMode,getSnapshot:()=>{const info=phaseInfo(state.angle);return {conditions:{"月の位置":positionName(state.angle),"太陽から見た角度":`約${Math.round(deg(state.angle))}°`},result:{"地球から見える月":info.name,"明るく見える割合":`約${info.lit}%`},metrics:{litPercent:info.lit,angle:Math.round(deg(state.angle))},graphData:null};},destroy(){controller.abort();stop();}};
  }

  window.RikaLabSimulations.moon={
    model:{phaseInfo},
    mount(root,{core,host,manifest:base}){
      const manifest={...base,modeLabel:"指定の月を探す",missionPrompt:"表示された名前の月になる位置を、自分で探そう。",
        modelNote:"日本を含む北半球からの見え方です。太陽・地球・月の大きさと距離は実際の比ではありません。満ち欠けに注目するため軌道を平面に描き、軌道の傾きや日食・月食は扱いません。月は常に半分が太陽に照らされています。",
        predictionChoices:["月が地球の影に入ると形が変わる","太陽・地球・月の位置関係で見える形が変わる","月そのものの形が変わる"],
        graph(records){return {type:"line",labels:records.map((_,i)=>`実験${i+1}`),series:[{label:"明るく見える割合",color:"#e3b83f",values:records.map(r=>Number(r.metrics.litPercent)||0)}],max:100,unit:"%",ariaLabel:"月の明るく見える割合を比べる折れ線グラフ"};}
      };
      const lab=new core.ScienceLab({root,manifest,host,buildSimulation:args=>createMoonSimulation({...args,core})});return lab.mount();
    }
  };
})();
