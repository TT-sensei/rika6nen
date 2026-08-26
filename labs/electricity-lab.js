(() => {
  "use strict";
  const { clamp, esc, many, option, range, metric, frame, register } = window.RikaLabExtra;

  const spec = {    electricity:{hint:"電池・スイッチ・器具を変えて、電気の変わり方を見よう。",model:"明るさや回転の数値は、条件を比べるためのモデル値です。",controls:[range("battery","電池の数",1,3,1,"個"),option("load","電気を使うもの","led",[["bulb","豆電球"],["led","LED"],["motor","モーター"],["heater","電熱線"]]),option("closed","スイッチ",0,[[0,"開く"],[1,"閉じる"]]),range("stored","蓄電器にためた量",0,100,0,"%")],presets:[["LEDを光らせる",{battery:1,load:"led",closed:1,stored:0}],["モーターを速く",{battery:3,load:"motor",closed:1,stored:0}],["ためた電気を使う",{battery:1,load:"bulb",closed:1,stored:80}]]}};

    function electricity(s){const on=Number(s.closed)===1,power=on?clamp(s.battery*28+s.stored*.45,0,100):0,names={bulb:"豆電球",led:"LED",motor:"モーター",heater:"電熱線"},forms={bulb:"光と熱",led:"光",motor:"運動",heater:"熱"},icons={bulb:"◉",led:"●",motor:"⚙",heater:"▥"};const body=`<rect width="900" height="500" fill="#f3f7f5"/><path d="M210 150H690V350H210Z" fill="none" stroke="#4c7380" stroke-width="12"/><path d="M155 215v70M190 200v100" stroke="#c65d49" stroke-width="10"/><text x="175" y="330" text-anchor="middle" class="component-label">電池 ${s.battery}個</text><path d="M410 150L${on?465:445} ${on?150:112}" stroke="#c65d49" stroke-width="9"/>${on?many(12,i=>`<circle class="current" cx="${240+(i*60)%410}" cy="${i%2?151:349}" r="5" style="--delay:${i*.12}s"/>`):''}<g transform="translate(690 250)"><circle r="58" fill="${on?'#fff2a6':'#d9dedc'}" stroke="#61787a" stroke-width="7"/><text text-anchor="middle" y="16" font-size="54">${icons[s.load]}</text></g><text x="690" y="335" text-anchor="middle" class="component-label">${names[s.load]}</text>`;return {svg:frame("電気の利用",body,on?`電気が${forms[s.load]}に変わる`:"スイッチが開いている"),results:[metric("回路",on?"つながっている":"切れている"),metric("働きの強さ",`${Math.round(power)}%`),metric("電気の変化",on?forms[s.load]:"まだ変化しない")],message:on?`電気が${forms[s.load]}に変わっています。電池の数や器具を変えてみよう。`:"スイッチを閉じると、結果がすぐ変わります。"};}


  register("electricity", spec, electricity);
})();
