(() => {
  "use strict";
  const { clamp, esc, many, option, range, metric, frame, register } = window.RikaLabExtra;
  const liquids={
    salt:{name:"食塩水",kind:"中性",red:"変化なし",blue:"変化なし",residue:"白い固体が残る",gas:"気体はほとんど出ない",metal:"大きな変化なし",color:"#b8dce4"},
    lime:{name:"石灰水",kind:"アルカリ性",red:"青色に変わる",blue:"変化なし",residue:"白い固体が残る",gas:"気体はほとんど出ない",metal:"大きな変化なし",color:"#d8ead9"},
    soda:{name:"炭酸水",kind:"酸性",red:"変化なし",blue:"赤色に変わる",residue:"目立つ固体は残らない",gas:"石灰水が白くにごる",metal:"大きな変化なし",color:"#c6e4ed"},
    acid:{name:"うすい塩酸",kind:"酸性",red:"変化なし",blue:"赤色に変わる",residue:"目立つ固体は残らない",gas:"調べる気体は出ない",metal:"泡が出て金属が小さくなる",color:"#d9e9ee"},
    ammonia:{name:"アンモニア水",kind:"アルカリ性",red:"青色に変わる",blue:"変化なし",residue:"目立つ固体は残らない",gas:"特有の気体を含む",metal:"大きな変化なし",color:"#dcebd5"}
  };

  const spec = {    solutions:{hint:"水溶液と調べ方を選ぶだけで、結果をすぐ比べられます。",model:"安全に性質を比べるための表示です。実物の薬品は先生の指示で扱います。",controls:[option("liquid","水溶液","salt",[["salt","食塩水"],["lime","石灰水"],["soda","炭酸水"],["acid","うすい塩酸"],["ammonia","アンモニア水"]]),option("test","調べ方","litmus",[["litmus","リトマス紙"],["evap","蒸発"],["gas","気体"],["metal","金属"]]),option("paper","リトマス紙","blue",[["red","赤色"],["blue","青色"]],s=>s.test==="litmus"),option("metal","金属","aluminum",[["aluminum","アルミニウム"],["iron","鉄"]],s=>s.test==="metal"),range("heat","加熱の進み",0,100,70,"%",s=>s.test==="evap")],presets:[["食塩水を蒸発",{liquid:"salt",test:"evap",heat:100}],["塩酸＋アルミ",{liquid:"acid",test:"metal",metal:"aluminum"}],["炭酸水の気体",{liquid:"soda",test:"gas"}]]}};

    function solutions(s){const l=liquids[s.liquid];let result,detail;if(s.test==="litmus"){result=s.paper==="red"?l.red:l.blue;detail=`${s.paper==="red"?"赤":"青"}色リトマス紙`;}if(s.test==="evap"){result=s.heat<90?"水が減っている":l.residue;detail=`加熱 ${s.heat}%`;}if(s.test==="gas"){result=l.gas;detail="出てくる気体";}if(s.test==="metal"){result=l.metal;detail=s.metal==="aluminum"?"アルミニウム":"鉄";}const level=s.test==="evap"?100-s.heat:70;const body=`<rect width="900" height="500" fill="#f8f5ee"/><path d="M300 165h300l-28 230H328z" fill="${l.color}" stroke="#466c75" stroke-width="7"/><rect x="328" y="${395-level*2.1}" width="244" height="${level*2.1}" fill="${l.color}" opacity=".75"/>${s.test==="evap"?many(s.heat/12,i=>`<path d="M${350+i*27} 145q14-24 0-45" class="steam"/>`):''}${s.test==="metal"?'<rect x="430" y="320" width="70" height="18" rx="5" fill="#aab1b5"/>':''}<text x="450" y="250" text-anchor="middle" class="beaker-label">${esc(l.name)}</text>`;return {svg:frame("水溶液を選ぶ → 調べ方を選ぶ",body,`結果：${result}`),results:[metric("水溶液",l.name),metric("調べ方",detail),metric("見える結果",result)],message:`${l.name}を「${detail}」で調べると「${result}」。組み合わせを替えて比べられます。`};}


  register("solutions", spec, solutions);
})();
