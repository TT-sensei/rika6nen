(() => {
  "use strict";
  window.RikaLabSimulations = window.RikaLabSimulations || {};
  const KEY = "rikaLab6.solutions.v1";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  const many = (n,fn) => Array.from({length:n},(_,i)=>fn(i)).join("");
  const LIQUIDS = {
    salt:{name:"食塩水", acid:"neutral", red:"same", blue:"same", residue:"白い固体が残った", gas:false, metal:false, color:"#b9dce4"},
    lime:{name:"石灰水", acid:"alkaline", red:"blue", blue:"same", residue:"白い固体が残った", gas:false, metal:false, color:"#d8ead9"},
    soda:{name:"炭酸水", acid:"acid", red:"same", blue:"red", residue:"目立った固体は残らなかった", gas:true, metal:false, color:"#c6e4ed"},
    hydrochloric:{name:"うすい塩酸", acid:"acid", red:"same", blue:"red", residue:"目立った固体は残らなかった", gas:false, metal:true, color:"#d9e9ee"},
    ammonia:{name:"うすいアンモニア水", acid:"alkaline", red:"blue", blue:"same", residue:"目立った固体は残らなかった", gas:false, metal:false, color:"#dcebd5"}
  };
  const UNKNOWN = {A:"hydrochloric",B:"salt",C:"ammonia"};
  const initial = () => ({solution:"salt",unknown:false,experiment:"litmus",paper:"blue",pipette:0,observation:"",litmus:{},evap:{active:false,time:0,amount:100,residue:false},gas:{heated:false,collected:false,lime:false,shaken:false},metal:{kind:"aluminum",inserted:false,time:0,reacted:false,evap:false,residue:false},inside:false,speed:1,prediction:"",question:"",consideration:""});
  const load = () => {try { const x=JSON.parse(localStorage.getItem(KEY)); return x && Array.isArray(x.records) ? x : {version:1,records:[],evidence:[]}; } catch(_){return {version:1,records:[],evidence:[]};}};
  const save = x => {try {localStorage.setItem(KEY,JSON.stringify(x));}catch(_) {}};
  const label = s => s.unknown ? `水溶液${s.solution}` : LIQUIDS[s.solution]?.name || s.solution;
  const liquid = s => LIQUIDS[s.unknown ? UNKNOWN[s.solution] : s.solution];

  function particles(s){
    if(!s.inside) return "";
    const l=liquid(s);
    return `<g class="solution-particles"><text x="35" y="52" class="model-label">中のようす（学習用モデル）</text><text x="35" y="73" class="model-note">見えないようすを考えるためのモデル</text>${many(18,i=>`<circle class="water-dot" cx="${80+(i*47)%360}" cy="${145+(i*29)%190}" r="4"/>`)}${many(l.gas?10:8,i=>`<circle class="solute-dot ${l.acid}" cx="${100+(i*71)%330}" cy="${150+(i*53)%170}" r="${l.gas?6:5}"/>`)}</g>`;
  }
  function paperColor(s,kind){
    const result=liquid(s)[kind];
    if(result==="red") return "#d94d4d";
    if(result==="blue") return "#3f7ec4";
    return kind==="red" ? "#e98b8b" : "#78aee8";
  }
  function observation(s){
    const l=liquid(s);
    if(s.experiment==="litmus" && s.pipette>=4) return `${s.paper==="red"?"赤":"青"}色リトマス紙が${paperColor(s,s.paper)==="#d94d4d"?"赤":"青"}色になった`;
    if(s.experiment==="evap" && s.evap.residue) return l.residue;
    if(s.experiment==="gas" && s.gas.shaken && s.gas.lime) return s.gas.collected && l.gas ? "石灰水が白くにごった" : "大きな変化は見られなかった";
    if(s.experiment==="metal" && s.metal.reacted) return "泡が出て、金属片が小さくなった";
    if(s.experiment==="metal" && s.metal.residue) return "反応後の液体を蒸発させると固体が現れた";
    return "まだ観察していません";
  }
  function bench(s){
    const l=liquid(s), obs=observation(s);
    const dish=s.experiment==="evap"||s.metal.evap ? `<g class="dish"><ellipse cx="610" cy="320" rx="120" ry="25" fill="#dbe4e1" stroke="#607d79" stroke-width="5"/><path d="M490 320q120 100 240 0v55q-120 70-240 0z" fill="#eef4f0" stroke="#607d79" stroke-width="5"/>${s.evap.amount<100?`<path d="M520 342q90-30 180 0v25q-90 28-180 0z" fill="${l.color}"/>`:""}${s.evap.residue||s.metal.residue?'<circle cx="610" cy="365" r="18" fill="#fff"/>':''}</g>`:"";
    const bubbles=s.metal.reacted?many(7,i=>`<circle class="reaction-bubble" cx="${450+(i*23)%50}" cy="${300-i*18}" r="${4+i%3}"/>`):"";
    const liquidMark=s.experiment==="litmus"?`<rect x="360" y="260" width="150" height="90" rx="14" fill="${l.color}" opacity=".75"/><path d="M360 290h150" stroke="#7b9a9a" stroke-width="4"/>`:"";
    const papers=s.experiment==="litmus"?`<g class="paper-card"><rect x="105" y="255" width="75" height="145" rx="8" fill="${s.paper==="red"?paperColor(s,"red"):"#fff"}" stroke="#7a8b89" stroke-width="4"/><rect x="205" y="255" width="75" height="145" rx="8" fill="${s.paper==="blue"?paperColor(s,"blue"):"#fff"}" stroke="#7a8b89" stroke-width="4"/><text x="142" y="420" text-anchor="middle" class="scene-label">赤色</text><text x="242" y="420" text-anchor="middle" class="scene-label">青色</text></g>`:"";
    return `<svg class="solutions-svg" viewBox="0 0 760 470" role="img" aria-label="水溶液の仮想実験台"><rect width="760" height="470" fill="#edf5f3"/><text x="28" y="35" class="scene-title">仮想実験台</text><path d="M35 405h690" stroke="#805a42" stroke-width="14"/><path d="M75 405v42M685 405v42" stroke="#805a42" stroke-width="12"/>${particles(s)}${papers}${liquidMark}${dish}<g class="beaker"><path d="M340 125h190v220q0 25-25 25H365q-25 0-25-25z" fill="${l.color}" fill-opacity=".62" stroke="#527879" stroke-width="6"/><path d="M340 185h190" stroke="#527879" stroke-width="4"/><text x="435" y="230" text-anchor="middle" class="scene-label">${esc(label(s))}</text><text x="435" y="250" text-anchor="middle" class="scene-note">見た目だけでは判断しない</text>${s.gas.heated?'<path class="gas-bubble" d="M410 170c-18-25 17-38 3-63 38 22 32 49 2 63z"/>':''}</g>${s.experiment==="metal"?`<g class="metal-piece" data-solution-action="metal"><rect x="410" y="290" width="50" height="28" rx="6" fill="#9babb0" stroke="#50676a" stroke-width="4"/>${bubbles}</g>`:""}<g class="dropper"><path d="M555 115l45 45-23 23-45-45z" fill="#d17a58" stroke="#754b43" stroke-width="4"/><circle cx="570" cy="140" r="10" fill="#eef7f7" stroke="#754b43" stroke-width="4"/><text x="600" y="125" class="scene-label">スポイト</text></g><text x="380" y="445" class="scene-caption">${esc(obs)}</text></svg>`;
  }
  function resultTable(s){
    const data=load(), rows=Object.keys(LIQUIDS).map(id=>{const rs=data.records.filter(r=>r.solution===id);const red=rs.find(r=>r.paper==="red"&&r.observation),blue=rs.find(r=>r.paper==="blue"&&r.observation),ev=rs.find(r=>r.experiment==="evap"&&r.observation),mt=rs.find(r=>r.experiment==="metal"&&r.observation);return `<tr><th>${LIQUIDS[id].name}</th><td>${red?esc(red.observation):"？"}</td><td>${blue?esc(blue.observation):"？"}</td><td>${ev?esc(ev.observation):"？"}</td><td>${mt?esc(mt.observation):"？"}</td></tr>`;}).join("");
    return `<div class="solution-table-wrap"><table class="solution-table"><thead><tr><th>水溶液</th><th>赤色リトマス</th><th>青色リトマス</th><th>蒸発</th><th>金属</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function records(){const d=load();if(!d.records.length)return `<p class="solution-empty">まだ証拠カードはありません。</p>`;return `<div class="solution-record-grid">${d.records.slice(0,5).map((r,i)=>`<article><b>証拠${d.records.length-i}</b><small>${esc(r.label)}</small><p><strong>観察：</strong>${esc(r.observation)}</p><p><strong>考察：</strong>${esc(r.consideration||"未記入")}</p></article>`).join("")}</div>`;}
  function classification(s){return `<div class="classification"><p class="classify-help">水溶液カードを、結果を根拠に仲間分けしよう。</p><div class="classify-card" draggable="true" data-class-card="${s.solution}">${esc(label(s))}</div><div class="classify-zones"><button type="button" data-class="acid">酸性</button><button type="button" data-class="neutral">中性</button><button type="button" data-class="alkaline">アルカリ性</button></div><p data-class-result>分類を選ぶと、観察結果と照らして振り返れます。</p></div>`;}
  function controls(s){
    const l=liquid(s);
    return `<div class="solution-shelf"><b>水溶液を選ぶ</b>${Object.entries(LIQUIDS).map(([id,x])=>`<button type="button" data-solution="${id}" aria-pressed="${!s.unknown&&s.solution===id}">${esc(x.name)}</button>`).join("")}<button type="button" data-unknown-toggle aria-pressed="${s.unknown}">${s.unknown?"未知液モードを終了":"なぞの水溶液を調べる"}</button></div><div class="solution-experiment"><b>実験方法を選ぶ</b><div class="experiment-tabs">${[["litmus","① リトマス紙"],["evap","② 蒸発"],["gas","③ 気体"],["metal","④ 金属"]].map(([id,t])=>`<button type="button" data-experiment="${id}" aria-pressed="${s.experiment===id}">${t}</button>`).join("")}</div></div>${s.experiment==="litmus"?`<div class="solution-steps"><p>①紙を選ぶ → ②スポイトを取る → ③水溶液へ → ④液体を紙へ</p><div class="paper-choice"><button type="button" data-paper="red" aria-pressed="${s.paper==="red"}">赤色リトマス紙</button><button type="button" data-paper="blue" aria-pressed="${s.paper==="blue"}">青色リトマス紙</button></div><button type="button" data-pipette>スポイトを${s.pipette===0?"取る":s.pipette===1?"水溶液へ入れる":s.pipette===2?"液体を吸う":s.pipette===3?"紙へたらす":"もう一度試す"}</button><p class="step-state">${s.pipette<4?"器具を順番に操作しよう":"観察結果を記録できます"}</p></div>`:""}${s.experiment==="evap"?`<div class="solution-steps"><p>蒸発皿へ水溶液を入れ、加熱して変化を観察します。</p><button type="button" data-evap-add>蒸発皿へ入れる</button><button type="button" data-evap-run>${s.evap.active?"⏸ 加熱を止める":"▶ 加熱する"}</button><div class="speed-buttons"><button data-speed="1">×1</button><button data-speed="5">×5</button><button data-speed="10">×10</button></div><p>液体量：${Math.round(s.evap.amount)}%</p></div>`:""}${s.experiment==="gas"?`<div class="solution-steps"><p>炭酸水などを温め、出てきた気体を集めて調べます。</p><button type="button" data-gas-action="heat">${s.gas.heated?"気体が出ている":"温めて気体を出す"}</button><button type="button" data-gas-action="collect">気体を集める</button><button type="button" data-gas-action="lime">石灰水を入れる</button><button type="button" data-gas-action="shake">振って観察</button><p>${s.gas.shaken&&s.gas.lime?(l.gas?"石灰水が白くにごった":"大きな変化は見られなかった"):"順番に操作して観察しよう"}</p></div>`:""}${s.experiment==="metal"?`<div class="solution-steps"><p>金属片を選び、試験管へ入れて時間を進めます。</p><select data-metal><option value="aluminum" ${s.metal.kind==="aluminum"?"selected":""}>アルミニウム</option><option value="iron" ${s.metal.kind==="iron"?"selected":""}>鉄</option></select><button type="button" data-metal-action="insert">金属片を試験管へ入れる</button><button type="button" data-metal-action="run">▶ 時間を進める</button>${s.metal.reacted?'<button type="button" data-metal-action="evap">反応後の液体を蒸発皿へ</button>':''}<p>${s.metal.residue?"反応後の液体から固体が現れた":s.metal.reacted?"泡が出て、金属片が小さくなった":"まだ変化を観察していません"}</p></div>`:""}<label class="solution-toggle"><input type="checkbox" data-inside ${s.inside?"checked":""}> 🔍 水溶液の中のようすを見る</label>`;
  }
  function mount(root,{manifest}){
    const s=initial();let raf=0,prompt="見た目だけで分かるかな？";
    root.innerHTML=`<nav class="breadcrumbs"><button class="text-button" type="button" data-lab-home>LAB一覧</button><span>›</span><span>水溶液LAB</span></nav><section class="solutions-lab" style="--lab-accent:${manifest.accent}"><header class="solutions-title"><div><p class="eyebrow">水溶液の性質</p><h1>🧪 水溶液LAB</h1><p>見た目だけでは分からない性質を、実験の証拠から調べよう。</p></div><span class="simulation-badge">これはシミュレーションです。実物実験は先生の指示に従います。</span></header><div class="solutions-workspace"><section class="solutions-stage-wrap"><div data-stage></div><div class="solution-stage-actions"><button class="primary-button" data-record>観察を証拠カードに保存</button><button class="secondary-button" data-reset>リセット</button></div></section><aside class="solutions-panel"><div class="panel-heading"><p class="eyebrow">EXPERIMENT PLAN</p><h2>実験を組み立てる</h2><p>水溶液を選び、方法を決め、器具を順番に操作します。</p></div><div data-controls></div></aside></div><section class="solution-inquiry"><div class="solution-subhead"><div><p class="eyebrow">PREDICTION</p><h2>実験前の予想</h2></div></div><textarea data-prediction rows="2" placeholder="どうなると思う？ 何を調べたい？"></textarea><div class="observation-box"><b>観察</b><span data-observation>まだ観察していません</span><label>考察<textarea data-consideration rows="2" placeholder="観察結果を根拠に、何が言えそう？"></textarea></label></div></section><section class="solution-evidence"><div class="solution-subhead"><div><p class="eyebrow">EVIDENCE BOARD</p><h2>証拠カード</h2><p>「見えたこと」と「考えたこと」を分けて残します。</p></div></div><div data-records>${records()}</div></section><section class="solution-results"><div class="solution-subhead"><div><p class="eyebrow">COMPARE</p><h2>実験結果表</h2><p>未実験は「？」のまま。結果を集めて比べよう。</p></div></div><div data-results>${resultTable(s)}</div>${classification(s)}</section><div class="solution-guide">🔎 <span data-guide>${prompt}</span></div></section>`;
    const stage=root.querySelector('[data-stage]'),ctl=root.querySelector('[data-controls]');
    const draw=()=>{stage.innerHTML=bench(s);ctl.innerHTML=controls(s);root.querySelector('[data-observation]').textContent=observation(s);root.querySelector('[data-records]').innerHTML=records();root.querySelector('[data-results]').innerHTML=resultTable(s);};
    const tick=()=>{if(!s.evap.active)return;s.evap.time+=.04*s.speed;s.evap.amount=clamp(100-s.evap.time*18,0,100);if(s.evap.amount<=0){s.evap.amount=0;s.evap.active=false;s.evap.residue=!!liquid(s).residue;}draw();raf=requestAnimationFrame(tick);};
    const guide=t=>{const el=root.querySelector('[data-guide]');if(el)el.textContent=t;};
    root.addEventListener('click',e=>{
      if(e.target.matches('[data-solution]')){s.unknown=false;s.solution=e.target.dataset.solution;s.pipette=0;s.evap=initial().evap;s.gas=initial().gas;s.metal=initial().metal;draw();}
      if(e.target.matches('[data-unknown-toggle]')){s.unknown=!s.unknown;s.solution="A";s.pipette=0;draw();guide("見た目では分からない。まずどの実験をする？");}
      if(e.target.matches('[data-experiment]')){s.experiment=e.target.dataset.experiment;s.pipette=0;draw();}
      if(e.target.matches('[data-paper]')){s.paper=e.target.dataset.paper;draw();}
      if(e.target.matches('[data-pipette]')){s.pipette=Math.min(4,s.pipette+1);if(s.pipette===4)s.observation=observation(s);draw();}
      if(e.target.matches('[data-inside]')){s.inside=e.target.checked;draw();}
      if(e.target.matches('[data-evap-add]')){s.evap.amount=100;s.evap.time=0;s.evap.residue=false;draw();guide("加熱すると液体量が変わる。残るものを観察しよう。");}
      if(e.target.matches('[data-evap-run]')){s.evap.active=!s.evap.active;if(s.evap.active)tick();draw();}
      if(e.target.matches('[data-speed]'))s.speed=Number(e.target.dataset.speed);
      if(e.target.matches('[data-gas-action]')){const a=e.target.dataset.gasAction;if(a==='heat')s.gas.heated=true;if(a==='collect'&&s.gas.heated)s.gas.collected=true;if(a==='lime'&&s.gas.collected)s.gas.lime=true;if(a==='shake'&&s.gas.lime)s.gas.shaken=true;draw();}
      if(e.target.matches('[data-metal-action]')){const a=e.target.dataset.metalAction;if(a==='insert')s.metal.inserted=true;if(a==='run'&&s.metal.inserted){s.metal.time+=1;if((s.solution==='hydrochloric'||(s.unknown&&UNKNOWN[s.solution]==='hydrochloric'))&&s.metal.kind==='aluminum'){s.metal.reacted=true;s.metal.time=1;}}if(a==='evap'&&s.metal.reacted){s.metal.evap=true;s.metal.residue=true;}draw();}
      if(e.target.matches('[data-class]')){const want=e.target.dataset.class, actual=liquid(s).acid;root.querySelector('[data-class-result]').textContent=want===actual?"観察した結果と合っている。別の証拠も確かめよう。":"その判断に使った観察結果を、もう一度比べてみよう。";}
      if(e.target.matches('[data-record]')){const d=load();const obs=observation(s);d.records.unshift({solution:s.unknown?UNKNOWN[s.solution]:s.solution,label:label(s),experiment:s.experiment,paper:s.paper,observation:obs,consideration:root.querySelector('[data-consideration]').value,prediction:root.querySelector('[data-prediction]').value});d.records=d.records.slice(0,20);d.evidence=d.records;save(d);draw();guide("証拠を残したね。条件を変えて、もう一つ比べよう。");}
      if(e.target.matches('[data-reset]')){Object.assign(s,initial());draw();guide("まず水溶液を選び、どの実験をするか決めよう。");}
    });
    root.addEventListener('change',e=>{if(e.target.matches('[data-metal]'))s.metal.kind=e.target.value;if(e.target.matches('[data-inside]'))s.inside=e.target.checked;draw();});
    root.addEventListener('input',e=>{if(e.target.matches('[data-prediction]'))s.prediction=e.target.value;if(e.target.matches('[data-consideration]'))s.consideration=e.target.value;});
    root.addEventListener('dragover',e=>{if(e.target.closest('[data-class]'))e.preventDefault();});
    root.addEventListener('drop',e=>{const zone=e.target.closest('[data-class]');if(!zone)return;e.preventDefault();root.querySelector('[data-class-result]').textContent=`${zone.textContent}に置いた。観察結果を根拠に考えよう。`;});
    draw();return()=>{s.evap.active=false;cancelAnimationFrame(raf);};
  }
  window.RikaLabSimulations.solutions={mount};
})();
