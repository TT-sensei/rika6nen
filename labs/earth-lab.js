(() => {
  "use strict";
  const { clamp, esc, many, option, range, metric, frame, register } = window.RikaLabExtra;

  const spec = {    earth:{time:true,hint:"水の速さ・土砂・出来事を変え、できる地層を比べよう。",model:"長い年月の変化を短時間で示し、地層の厚さや粒を単純化しています。",controls:[range("speed","水の速さ",10,100,55,"%"),range("sediment","運ばれる土砂",10,100,55,"%"),option("event","大地の出来事","none",[["none","なし"],["ash","火山灰"],["quake","地震"]])],presets:[["ゆっくり流す",{speed:20,sediment:55,event:"none"}],["速く流す",{speed:90,sediment:55,event:"none"}],["火山灰を重ねる",{speed:55,sediment:55,event:"ash"}],["地震を起こす",{speed:55,sediment:55,event:"quake"}]]}};

    function earth(s,t){const layers=clamp(Math.floor(t/2)+3,3,10),grain=s.speed>72?"れき":s.speed>38?"砂":"泥",width=480+Math.round(s.sediment*2.4),marks=many(layers,i=>{const kinds=[grain,s.speed>50?"砂":"泥",s.speed>75?"れき":"砂"],kind=kinds[i%3],color=kind==="れき"?"#ad9478":kind==="砂"?"#d8bf89":"#9c918a",y=390-i*34;return `<g ${s.event==="quake"&&i>3?'transform="translate(28 -4)"':''}><rect x="${450-width/2}" y="${y}" width="${width}" height="31" fill="${color}"/><text x="${465-width/2}" y="${y+21}" class="layer-label">${kind}</text></g>`}),ash=s.event==="ash"?`<rect x="${450-width/2}" y="${390-Math.min(layers,6)*34}" width="${width}" height="11" fill="#55565f"/>`:"",fault=s.event==="quake"?'<path d="M455 120l-28 340" stroke="#80534d" stroke-width="7" stroke-dasharray="10 8"/>':"",art=`<rect width="900" height="500" fill="#eef5fa"/><path d="M70 120q180 45 330 0t430 0v120H70z" fill="#b8dce7" opacity=".75"/>${many(14,i=>`<circle class="sediment" cx="${220+(i*61)%470}" cy="${145+(i*29)%90}" r="${3+i%5}" style="--delay:${i*.11}s"/>`)}${marks}${ash}${fault}`;return {svg:frame("流水と地層",art,`${grain}が目立つ条件・${layers}層`),results:[metric("目立つ粒",grain),metric("地層",`${layers}層`),metric("大地の変化",s.event==="ash"?"火山灰が重なる":s.event==="quake"?"地層がずれる":"堆積が続く")],message:s.speed>72?"流れが強い条件では、大きな粒も運ばれます。":"流れが弱まると、運ばれた粒が積もります。条件を変えて比べよう。"};}


  register("earth", spec, earth);
})();
