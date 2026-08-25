(() => {
  "use strict";
  const KEY = "rikaLab6.electricity.v1";
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const PARTS = {
    generator:{label:"手回し発電機",icon:"⟳",kind:"source"}, storage:{label:"蓄電器",icon:"▰",kind:"storage"},
    switch:{label:"スイッチ",icon:"⌁",kind:"switch"}, led:{label:"LED",icon:"●",kind:"light"}, bulb:{label:"豆電球",icon:"◉",kind:"light"},
    motor:{label:"モーター",icon:"⚙",kind:"motion"}, buzzer:{label:"ブザー",icon:"♫",kind:"sound"}, heater:{label:"電熱線",icon:"▥",kind:"heat"}
  };
  const initial = () => ({parts:[], wires:[], selected:null, speed:0, output:0, charge:0, switchOn:true, load:"led", electricView:false, energyView:false, dark:60, sensor:false, temp:20, heatTime:0, running:false, records:[]});
  function read(){ try { const s=JSON.parse(localStorage.getItem(KEY)); return s && typeof s === "object" ? {...initial(),...s} : initial(); } catch(_){ return initial(); } }
  function write(s){ try { localStorage.setItem(KEY,JSON.stringify({version:1,records:s.records||[]})); } catch(_){} }
  function has(s,type){ return s.parts.some(p=>p.type===type); }
  function activeLoad(s){ if(s.sensor && s.dark < 45) return "led"; return s.load; }
  function connected(s,a,b){ return s.wires.some(w=>(w[0]===a&&w[1]===b)||(w[0]===b&&w[1]===a)); }
  function circuit(s){
    const load=activeLoad(s), source = has(s,"generator") || (s.charge>1 && has(s,"storage"));
    const path = source && has(s,load) && has(s,"switch") && s.switchOn;
    return {load,source,closed:path && (has(s,"generator") ? connected(s,"generator",load) || s.wires.length>=2 : s.wires.length>=1)};
  }
  function makePart(type, x, y){ return {id:`p${Date.now()}${Math.random().toString(36).slice(2,5)}`,type,x,y}; }
  function mount(root){
    const s=read(); s.records=s.records||[]; let raf=0, crankAngle=0, lastAngle=null, dragPart=null, wireStart=null;
    root.innerHTML=`
      <nav class="breadcrumbs" aria-label="現在位置"><button class="text-button" type="button" data-lab-home>LAB一覧</button><span>›</span><span>電気LAB</span></nav>
      <section class="electricity-lab" style="--lab-accent:#bd8a13">
        <header class="lab-titlebar"><div><p class="eyebrow">電気の利用</p><h1>💡 電気LAB</h1><p>つなぐ、回す、ためる。電気がどんな働きに変わるか試してみよう。</p></div><div class="electricity-status" data-status>まず部品を実験ボードへ置こう</div></header>
        <div class="electricity-workspace">
          <section class="electricity-stage-wrap"><svg class="electricity-svg" viewBox="0 0 900 590" role="img" aria-label="部品を置いてつなぐ電気実験ボード" data-svg></svg><div class="electricity-stage-tip">部品を置いたら、端子●から端子●へドラッグして導線をつなげます。</div></section>
          <aside class="electricity-panel" data-panel></aside>
        </div>
        <section class="electricity-bottom"><div class="electricity-record"><h2>実験を記録する</h2><label>予想<textarea data-prediction placeholder="どうなると思う？"></textarea></label><label>考察<textarea data-thought placeholder="結果から何が言えそう？"></textarea></label><div class="button-row"><button class="primary-button" type="button" data-record>この実験を記録</button><button class="secondary-button" type="button" data-clear>結果をリセット</button></div></div><div class="electricity-data"><h2>比較データ</h2><div data-graph></div><div data-records></div></div></section>
        <p class="model-note">電気の流れを光点で示す表示は、働いていることを分かりやすくするためのモデルです。実際の電気を粒として表したものではありません。</p>
      </section>`;
    const svg=root.querySelector("[data-svg]"), panel=root.querySelector("[data-panel]"), status=root.querySelector("[data-status]");
    const preset=(types)=>{ s.parts=[]; s.wires=[]; types.forEach((t,i)=>s.parts.push(makePart(t,120+i*175,250+(i%2)*70))); s.load=types.includes("motor")?"motor":types.includes("bulb")?"bulb":"led"; draw(); };
    function draw(){
      const c=circuit(s), power=Math.min(1,(s.output/100)+(s.charge/100));
      const wireMarkup=s.wires.map(w=>{const a=s.parts.find(p=>p.id===w[0]),b=s.parts.find(p=>p.id===w[1]);if(!a||!b)return"";const motion=s.electricView&&c.closed?`<circle class="electric-dot"><animateMotion dur="1s" repeatCount="indefinite" path="M${a.x+58},${a.y+38} L${b.x+58},${b.y+38}"/></circle>`:"";return `<line class="wire" x1="${a.x+58}" y1="${a.y+38}" x2="${b.x+58}" y2="${b.y+38}"/>${motion}`;}).join("");
      const emptyMarkup=s.parts.length?"":"<text x=\"450\" y=\"300\" text-anchor=\"middle\" class=\"empty-board\">ここに部品を置いてみよう</text>";
      svg.innerHTML=`<rect x="0" y="0" width="900" height="590" rx="22" fill="#e8f0ed"/><text x="34" y="42" class="board-title">CIRCUIT BOARD</text><text x="34" y="67" class="board-sub">部品を自由に置き、端子をつないで実験</text>${wireMarkup}${s.parts.map(p=>partMarkup(p,c,power)).join("")}${emptyMarkup}`;
      panel.innerHTML=`<div class="panel-heading"><h2>操作と測定</h2><p>${c.closed?"回路が働いています。現象を観察しよう。":"電気が働く条件を探してみよう。"}</p></div>
        <section class="part-tray"><h3>部品を置く</h3><div class="part-buttons">${Object.entries(PARTS).map(([id,p])=>`<button type="button" data-add="${id}">${p.icon}<span>${p.label}</span></button>`).join("")}</div><button type="button" class="secondary-button full" data-preset>実験例を置く</button></section>
        <section class="control-section"><h3>手回し発電機</h3><div class="crank-control" data-crank><div class="crank-ring"><span>⟳</span></div><b>ここを円に回す</b></div><div class="meter-line"><span>回す速さ</span><strong>${Math.round(s.speed)}</strong></div><div class="meter-line"><span>発電の目安</span><strong>${Math.round(s.output)}%</strong></div></section>
        <section class="control-section"><h3>条件</h3><label class="toggle-line"><input type="checkbox" data-switch ${s.switchOn?"checked":""}> スイッチを閉じる</label><label class="toggle-line"><input type="checkbox" data-electric ${s.electricView?"checked":""}> 電気を見る（モデル）</label><label class="toggle-line"><input type="checkbox" data-energy ${s.energyView?"checked":""}> エネルギーを見る</label><label class="toggle-line"><input type="checkbox" data-sensor ${s.sensor?"checked":""}> 暗いとLEDをつける</label><label class="range-line">明るさ <input type="range" min="0" max="100" value="${s.dark}" data-dark><output>${s.dark<45?"暗い":"明るい"}</output></label></section>
        <section class="control-section"><h3>蓄電器</h3><div class="charge-meter"><i style="width:${s.charge}%"></i></div><div class="meter-line"><span>たまった量</span><strong>${Math.round(s.charge)}%</strong></div><button type="button" class="secondary-button full" data-use>蓄電器から使う</button></section>`;
      root.querySelector("[data-status]").textContent=c.closed?`${PARTS[c.load]?.label||"器具"}が働いています`:(has(s,"generator")?"ハンドルを回してみよう":"部品を置いて、端子をつないでみよう");
      root.querySelector("[data-graph]").innerHTML=s.energyView?`<div class="energy-map">電気 → ${PARTS[c.load]?.label||"器具"} → ${c.load==="motor"?"運動":c.load==="heater"?"熱":c.load==="buzzer"?"音":"光"}</div>`:"<p class=\"electricity-empty\">実験を記録すると、ここに比較グラフができます。</p>";
      root.querySelector("[data-records]").innerHTML=s.records.length?`<div class="electricity-record-list">${s.records.slice(0,5).map((r,i)=>`<article><b>実験${s.records.length-i}</b><span>${esc(r.load)}・${r.output}%</span><small>動作時間 ${r.time}秒</small></article>`).join("")}</div>`:"";
      bindDynamic();
    }
    function partMarkup(p,c,power){ const active=c.closed && c.load===p.type; const glow=active?Math.min(1,power):0; return `<g class="electric-part" data-part-id="${p.id}" transform="translate(${p.x} ${p.y})"><rect width="116" height="76" rx="15" class="part-body ${active?"active":""}"/><text x="58" y="30" text-anchor="middle" class="part-icon">${PARTS[p.type].icon}</text><text x="58" y="57" text-anchor="middle" class="part-label">${PARTS[p.type].label}</text><circle class="terminal" data-terminal="${p.id}:pos" cx="5" cy="38" r="9"/><circle class="terminal" data-terminal="${p.id}:neg" cx="111" cy="38" r="9"/>${active&&["led","bulb"].includes(p.type)?`<circle cx="58" cy="18" r="24" class="glow" style="opacity:${glow}"/>`:""}${active&&p.type==="motor"?`<text x="58" y="18" class="spin">↻</text>`:""}</g>`; }
    function bindDynamic(){
      panel.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{s.parts.push(makePart(b.dataset.add,130+(s.parts.length%4)*180,105+Math.floor(s.parts.length/4)*110));draw();});
      panel.querySelector("[data-preset]").onclick=()=>preset(["generator","switch","storage","led"]);
      panel.querySelector("[data-switch]").onchange=e=>{s.switchOn=e.target.checked;draw();};
      panel.querySelector("[data-electric]").onchange=e=>{s.electricView=e.target.checked;draw();};
      panel.querySelector("[data-energy]").onchange=e=>{s.energyView=e.target.checked;draw();};
      panel.querySelector("[data-sensor]").onchange=e=>{s.sensor=e.target.checked;draw();};
      panel.querySelector("[data-dark]").oninput=e=>{s.dark=+e.target.value;draw();};
      panel.querySelector("[data-use]").onclick=()=>{ if(s.charge>0){s.output=0;s.running=true;draw();} };
      svg.querySelectorAll("[data-terminal]").forEach(el=>{el.addEventListener("pointerdown",e=>{wireStart=el.dataset.terminal;el.setPointerCapture(e.pointerId);});el.addEventListener("pointerup",e=>{if(wireStart&&wireStart!==el.dataset.terminal){const a=wireStart.split(":")[0],b=el.dataset.terminal.split(":")[0];if(a!==b&&!s.wires.some(w=>w.includes(a)&&w.includes(b)))s.wires.push([a,b]);}wireStart=null;draw();});});
      svg.querySelectorAll("[data-part-id]").forEach(el=>{el.addEventListener("pointerdown",e=>{if(e.target.matches("[data-terminal]"))return;dragPart=el.dataset.partId;el.setPointerCapture(e.pointerId);});el.addEventListener("pointermove",e=>{if(!dragPart)return;const r=svg.getBoundingClientRect(),p=s.parts.find(x=>x.id===dragPart);p.x=Math.max(20,Math.min(760,(e.clientX-r.left)*900/r.width-58));p.y=Math.max(82,Math.min(500,(e.clientY-r.top)*590/r.height-38));draw();});el.addEventListener("pointerup",()=>{dragPart=null;});});
      const crank=panel.querySelector("[data-crank]"); crank.onpointerdown=e=>{crank.setPointerCapture(e.pointerId);lastAngle=null;}; crank.onpointermove=e=>{if(!crank.hasPointerCapture(e.pointerId))return;const r=crank.getBoundingClientRect(),a=Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2));if(lastAngle!==null){let d=a-lastAngle;if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;s.speed=Math.min(100,Math.max(0,s.speed*.72+Math.abs(d)*170));s.output=Math.min(100,s.output*.75+s.speed*.55);if(has(s,"storage")&&s.speed>3)s.charge=Math.min(100,s.charge+s.speed*.006);}lastAngle=a;draw();}; crank.onpointerup=()=>{lastAngle=null;};
    }
    root.querySelector("[data-record]").onclick=()=>{const c=circuit(s);s.records.unshift({load:PARTS[c.load]?.label||c.load,output:Math.round(s.output),time:Math.max(1,Math.round(s.charge/8+2)),charge:Math.round(s.charge),prediction:root.querySelector("[data-prediction]").value,thought:root.querySelector("[data-thought]").value});s.records=s.records.slice(0,12);write(s);draw();};
    root.querySelector("[data-clear]").onclick=()=>{s.records=[];try{localStorage.removeItem(KEY);}catch(_){}draw();};
    const tick=()=>{s.speed*=.92;s.output*=.96;const c=circuit(s);if(c.closed&&s.charge>0&&!has(s,"generator")){s.charge=Math.max(0,s.charge-.15);if(c.load==="heater")s.temp=Math.min(100,s.temp+.08);};draw();raf=requestAnimationFrame(tick);};
    draw(); raf=requestAnimationFrame(tick); return()=>cancelAnimationFrame(raf);
  }
  window.RikaLabSimulations=window.RikaLabSimulations||{}; window.RikaLabSimulations.electricity={mount};
})();
