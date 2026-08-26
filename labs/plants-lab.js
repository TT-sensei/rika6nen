(() => {
  "use strict";
  const { clamp, esc, many, option, range, metric, frame, register } = window.RikaLabExtra;

  const spec = {time:true,hint:"光・水・葉を一つずつ変え、植物のはたらきを比べよう。",model:"水の粒やでんぷん量は、見えないはたらきを比べるためのモデルです。",controls:[range("light","光の強さ",0,100,75,"%"),range("water","土の水",0,100,80,"%"),range("leaves","葉の枚数",0,6,5,"枚"),range("covered","葉をおおう",0,100,0,"%")],presets:[["光を当てる",{light:90,water:80,leaves:5,covered:0}],["暗くする",{light:0,water:80,leaves:5,covered:0}],["葉をおおう",{light:90,water:80,leaves:5,covered:80}]]};

    function plants(s,t){const usable=s.leaves*(1-s.covered/100),uptake=clamp(s.water*(1-Math.exp(-(t+5)/18))*(.25+.75*s.light/100),0,100),starch=clamp(s.light*usable/6,0,100),trans=clamp(s.light*s.leaves/6,0,100),leaves=many(s.leaves,i=>`<ellipse cx="${450+(i%2?-1:1)*(45+i*16)}" cy="${160+i*38}" rx="${48-i*3}" ry="18" class="leaf" opacity="${s.covered&&i%2===0?.3:1}"/>`),body=`<rect width="900" height="500" fill="#f0f7ef"/><path d="M450 385q-45 45-115 50M450 385q45 45 115 50M450 385V120" fill="none" stroke="#8e6a47" stroke-width="16"/><path d="M450 388V123" stroke="#49a7bc" stroke-width="${2+uptake/12}"/>${leaves}${many(uptake/8,i=>`<circle class="water-particle" cx="450" cy="${380-(i*22)%250}" r="5" style="--delay:${i*.12}s"/>`)}<circle cx="735" cy="95" r="45" fill="#f6d86d" opacity="${.15+s.light/120}"/>`;return {svg:frame("植物の水と養分",body,"根から吸収した水が茎を通って葉へ移動"),results:[metric("水の移動",`${Math.round(uptake)}%`),metric("葉から出る水",`${Math.round(trans)}%`),metric("でんぷんの目安",`${Math.round(starch)}%`)],message:s.light<10?"光がない条件では、でんぷんのでき方が大きく変わります。":s.covered>60?"葉をおおうと、光を受ける部分が減ります。":"光・水・葉のどれか一つを変えて、結果を比べよう。"};}


  register("plants", spec, plants);
})();
