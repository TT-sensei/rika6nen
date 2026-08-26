(() => {
  "use strict";
  const { clamp, esc, many, option, range, metric, frame, register } = window.RikaLabExtra;

  const spec = {hint:"運動の強さや追うものを変え、肺・心臓・全身のつながりを見よう。",model:"血液の色や動く粒は、体内の流れを見やすくしたモデルです。",controls:[option("activity","体の動かし方",0,[[0,"安静"],[1,"軽い運動"],[2,"強い運動"]]),option("trace","追いかけるもの","oxygen",[["oxygen","酸素"],["co2","二酸化炭素"],["food","養分"]]),range("meal","食後の養分",0,100,40,"%",s=>s.trace==="food")],presets:[["安静にする",{activity:0,trace:"oxygen"}],["強く運動する",{activity:2,trace:"oxygen"}],["養分を追う",{activity:0,trace:"food",meal:90}]]};

    function body(s){const heart=72+s.activity*30,breath=15+s.activity*8,label=s.trace==="oxygen"?"酸素：肺 → 血液 → 全身":s.trace==="co2"?"二酸化炭素：全身 → 血液 → 肺":"養分：小腸 → 血液 → 全身",color=s.trace==="oxygen"?"#4f9fc2":s.trace==="co2"?"#7d83a9":"#d59643";const art=`<rect width="900" height="500" fill="#f8f3f3"/><ellipse cx="340" cy="190" rx="80" ry="105" fill="#c6e2e6" stroke="#4f8895" stroke-width="7"/><ellipse cx="560" cy="190" rx="80" ry="105" fill="#c6e2e6" stroke="#4f8895" stroke-width="7"/><path d="M450 210c-70-65-135 38 0 158 135-120 70-223 0-158z" fill="#e6b2b6" stroke="#a55464" stroke-width="7" class="heart" style="--pulse:${[1.05,.7,.42][s.activity]}s"/><path d="M450 340Q250 405 170 310M450 340Q650 405 730 310" fill="none" stroke="${color}" stroke-width="12"/>${many(14,i=>`<circle class="blood-cell" cx="${245+(i*38)%410}" cy="${350+(i%3)*12}" r="5" style="--delay:${i*.1}s;fill:${color}"/>`)}`;return {svg:frame("肺・心臓・全身のつながり",art,label),results:[metric("心拍",`${heart}回/分`),metric("呼吸",`${breath}回/分`),s.trace==="food"?metric("吸収される養分",`${Math.round(s.meal*.8)}%`):metric("酸素の必要量",`${45+s.activity*27}%`)],message:s.activity===2?"運動を強くすると、全身へ多く運ぶため心拍と呼吸が増えます。":label};}


  register("body", spec, body);
})();
