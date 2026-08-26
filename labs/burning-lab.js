(() => {
  "use strict";
  const { clamp, esc, many, option, range, metric, frame, register } = window.RikaLabExtra;

  const spec = {    burning:{time:true,hint:"容器のすき間を変えると、炎と空気はどう変わる？",model:"燃焼時間と気体の割合は、条件の違いを見やすくしたモデル値です。",controls:[option("airway","空気の通り道","sealed",[["open","容器なし"],["sealed","密閉"],["bottom","下だけ開く"],["both","上下を開く"]]),range("oxygen","はじめの酸素",5,30,21,"%"),option("jar","容器の大きさ",2,[[1,"小"],[2,"中"],[3,"大"]])],presets:[["密閉する",{airway:"sealed",oxygen:21,jar:2}],["上下を開く",{airway:"both",oxygen:21,jar:2}],["酸素を減らす",{airway:"open",oxygen:9,jar:2}]]}};

    function burning(s,t){const exchange={open:1,sealed:0,bottom:.12,both:.82}[s.airway],used=t*(s.airway==="sealed"?1.25:.24)*(2/s.jar),oxygen=clamp(s.oxygen-used+exchange*.2*t,0,s.oxygen),power=clamp((oxygen-6)/15,0,1)*(.35+.65*exchange),on=power>.08,h=on?35+power*105:0,gap=s.airway==="bottom"||s.airway==="both",top=s.airway==="both";const body=`<rect width="900" height="500" fill="#eef7f9"/><rect x="245" y="65" width="410" height="350" rx="28" fill="#c8e7ef" fill-opacity=".45" stroke="#5b8b9a" stroke-width="7"/><rect x="425" y="285" width="50" height="125" rx="9" fill="#fff7dc" stroke="#998b69" stroke-width="4"/>${on?`<path class="flame" d="M450 ${285-h}c-28 45-22 78 0 ${h} 30-${h*.35} 28-${h*.7} 0-${h}z"/>`:`<path d="M430 260q22-18 40 0" fill="none" stroke="#829194" stroke-width="7"/>`}${gap?'<path d="M245 385h65" stroke="#d26b42" stroke-width="12"/>':''}${top?'<path d="M590 65h65" stroke="#d26b42" stroke-width="12"/>':''}${exchange?many(5,i=>`<path class="air-in" d="M${285+i*70} 390q10-80 80-135" style="--delay:${i*.18}s"/>`):''}`;return {svg:frame("空気の通り道と燃焼",body,on?(power<.3?"炎が弱くなっている":"燃え続けている"):"炎が消えた"),results:[metric("炎",on?`${Math.round(power*100)}%`:"消えた"),metric("酸素",`${oxygen.toFixed(1)}%`),metric("空気の入れ替わり",exchange>.7?"大きい":exchange>.05?"少ない":"ほぼない")],message:exchange>.7?"入口と出口があると、空気が入れ替わりやすくなります。":oxygen<8?"酸素が少なくなると、燃え続けられません。":"時間を進めると、酸素と炎が変化します。"};}


  register("burning", spec, burning);
})();
