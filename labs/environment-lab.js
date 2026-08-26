(() => {
  "use strict";
  const { clamp, esc, many, option, range, metric, frame, register } = window.RikaLabExtra;

  const spec = {time:true,hint:"一つの生物や水を変えると、ほかへ変化が広がります。",model:"実際の自然を、食べる関係が見えるように単純化したモデルです。",controls:[range("plants","植物",5,95,55),range("insects","昆虫",1,70,20),range("small","小動物",1,40,10),range("birds","鳥",1,25,6),range("water","水の量",10,100,75,"%")],presets:[["つり合った草地",{plants:55,insects:20,small:10,birds:6,water:75}],["昆虫が減る",{plants:55,insects:3,small:10,birds:6,water:75}],["水が少ない",{plants:55,insects:20,small:10,birds:6,water:20}]]};

    function environment(s,t){let p=s.plants,i=s.insects,a=s.small,b=s.birds;for(let n=0;n<Math.floor(t);n++){p=clamp(p+.02*p*(s.water/70)-.018*i,2,100);i=clamp(i+.04*i*(p/55)-.035*a-.018*b,1,80);a=clamp(a+.035*a*(i/20)-.03*b-.008*(100-s.water),1,45);b=clamp(b+.022*b*(a/10)-.018*b,1,30)}const art=`<rect width="900" height="500" fill="#eef5ea"/><path d="M0 390Q220 340 430 390T900 375V500H0Z" fill="#7fba69"/>${many(p/5,k=>`<text x="${110+(k*57)%650}" y="${380-(k%3)*24}" font-size="24">🌱</text>`)}${many(i/3,k=>`<text x="${180+(k*71)%570}" y="${315-(k%3)*25}" font-size="25">🐛</text>`)}${many(a/2,k=>`<text x="${250+(k*83)%480}" y="${245-(k%2)*30}" font-size="28">🐸</text>`)}${many(b/1.5,k=>`<text x="${330+(k*97)%390}" y="${145-(k%2)*25}" font-size="29">🐦</text>`)}<path d="M180 350Q260 300 340 280M380 255Q460 210 535 195M575 175Q630 130 700 125" fill="none" stroke="#52775a" stroke-width="5" stroke-dasharray="8 7"/>`;return {svg:frame("食べる・食べられる関係",art,"🌱 → 🐛 → 🐸 → 🐦"),results:[metric("植物",Math.round(p)),metric("昆虫",Math.round(i)),metric("小動物・鳥",`${Math.round(a)}・${Math.round(b)}`)],message:t<1?"条件を変えたら時間を進め、ほかの生物への変化を見よう。":"一つの変化が、食べる関係を通して別の生物へ広がります。"};}


  register("environment", spec, environment);
})();
