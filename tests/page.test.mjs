import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\ninit\(\);/,'');
function page(fetchImpl=async()=>({ok:false})){
  const elements=new Map();
  function element(){
    const classes=new Set();
    return {innerHTML:'',textContent:'',attrs:{},listeners:{},
      classList:{add(...a){a.forEach(x=>classes.add(x))},remove(...a){a.forEach(x=>classes.delete(x))},contains(x){return classes.has(x)},toggle(x,value){if(value??!classes.has(x))classes.add(x);else classes.delete(x)}},
      addEventListener(name,fn){this.listeners[name]=fn},setAttribute(name,value){this.attrs[name]=value},focus(){},
      querySelectorAll(){return []},contains(){return false}};
  }
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return []},listeners:{},addEventListener(name,fn){this.listeners[name]=fn}};
  const media={matches:false,addEventListener(){}};
  const reduced={matches:true};
  const context=vm.createContext({document,window:{matchMedia:q=>q.includes('900px')?media:reduced},fetch:fetchImpl,console});
  vm.runInContext(script,context);
  return {context,document,elements,media,reduced,element,run:s=>vm.runInContext(s,context)};
}
const sample=JSON.parse(fs.readFileSync('data/2026-10-12.json','utf8'));

test('every menu file matches its date, weekday and menu schema',()=>{
  const dates=JSON.parse(fs.readFileSync('data/index.json','utf8')).dates;
  assert.equal(new Set(dates).size,dates.length);
  const files=fs.readdirSync('data').filter(f=>f!=='index.json');
  assert.deepEqual(files.sort(),dates.map(d=>d+'.json').sort());
  for(const date of dates){
    const day=JSON.parse(fs.readFileSync(`data/${date}.json`,'utf8'));
    assert.equal(day.date,date);
    const parsed=new Date(`${date}T12:00:00+09:00`);
    assert.equal(day.dayCode,['sun','mon','tue','wed','thu','fri','sat'][parsed.getUTCDay()]);
    for(const floor of ['10','20']){
      if(day.floors[floor]===undefined)continue; // A floor may not have been published yet.
      assert.ok(Array.isArray(day.floors[floor]),date);
      for(const menu of day.floors[floor]){
        assert.equal(menu.length,3);assert.equal(typeof menu[0],'string');assert.equal(typeof menu[1],'string');
        assert.ok(Array.isArray(menu[2]));assert.ok(menu[2].every(x=>typeof x==='string'));
      }
    }
  }
});

test('all menu contents and counts render without changing source values',()=>{
  const p=page();
  for(const date of JSON.parse(fs.readFileSync('data/index.json')).dates){
    p.context.day=JSON.parse(fs.readFileSync(`data/${date}.json`));
    const rendered=p.run('card(day)');
    for(const floor of ['10','20']){
      const menus=p.context.day.floors[floor]||[];
      assert.ok(rendered.includes(`${menus.length}가지 메뉴`));
      for(const [name,type,items] of menus){
        for(const value of [name,type,...items]){
          p.context.value=value;assert.ok(rendered.includes(p.run('escapeHTML(value)')),`${date}: ${value}`);
        }
      }
    }
  }
});

test('HTML from all menu fields is escaped; empty or malformed menus are safe',()=>{
  const p=page();
  const rendered=p.run(`box(['<img src=x onerror=alert(1)>','" onclick="bad',['<script>bad</script>']],20)`);
  assert.ok(!rendered.includes('<img'));assert.ok(!rendered.includes('<script>'));
  assert.ok(rendered.includes('&lt;img'));assert.ok(rendered.includes('&quot;'));
  assert.doesNotThrow(()=>p.run('card({date:"2026-10-18",floors:{}})'));
  assert.ok(p.run('emptyDayCard("2026-10-18")').includes('등록된 식단 정보가 없습니다.'));
});

test('date navigation handles weekends, month/year boundaries and leap days',()=>{
  const p=page();
  assert.equal(p.run('key(mondayOf(parseKey("2026-10-18")))'),'2026-10-12');
  assert.equal(p.run('key(addDays(parseKey("2026-12-31"),1))'),'2027-01-01');
  assert.equal(p.run('key(addDays(parseKey("2024-02-28"),1))'),'2024-02-29');
  assert.equal(p.run('key(addDays(parseKey("2026-10-01"),-7))'),'2026-09-24');
});

test('day loading deduplicates concurrent requests and caches missing dates',async()=>{
  let calls=0;
  const p=page(async url=>{calls++;return {ok:url.includes('10-12'),json:async()=>sample}});
  const first=p.run('loadDay("2026-10-12")'),second=p.run('loadDay("2026-10-12")');
  assert.equal(first,second);await first;assert.equal(calls,1);
  await p.run('loadDay("2026-10-18")');await p.run('loadDay("2026-10-18")');assert.equal(calls,2);
  assert.equal(p.run('pendingDays.size'),0);
});

test('network errors and invalid JSON fall back without rejecting',async()=>{
  for(const fetcher of [async()=>{throw Error('network')},async()=>({ok:true,json:async()=>{throw Error('json')}}),async()=>({ok:true,json:async()=>null})]){
    const p=page(fetcher);assert.equal(await p.run('loadDay("2026-10-12")'),null);
  }
});

test('stale async render cannot overwrite the latest selected date',async()=>{
  const pending=new Map();
  const p=page(url=>new Promise(resolve=>pending.set(url,resolve)));
  p.run('selectedDate="2026-10-12";currentMonday=mondayOf(parseKey(selectedDate))');
  const old=p.run('render()');
  p.run('selectedDate="2026-10-13"');const current=p.run('render()');
  pending.get('./data/2026-10-13.json')({ok:true,json:async()=>({...sample,date:'2026-10-13'})});await current;
  pending.get('./data/2026-10-12.json')({ok:true,json:async()=>sample});await old;
  assert.ok(p.elements.get('weekGrid').innerHTML.includes('data-date="2026-10-13"'));
});

test('single day, week view, date bar, floor reset and reduced-motion swipe flow',async()=>{
  const p=page(async()=>({ok:true,json:async()=>sample}));
  p.run('selectedDate="2026-10-12";currentMonday=mondayOf(parseKey(selectedDate));desktopWeekView=true');
  await p.run('render()');assert.equal((p.elements.get('weekGrid').innerHTML.match(/<article /g)||[]).length,5);
  p.run('desktopWeekView=false');await p.run('render()');assert.equal((p.elements.get('weekGrid').innerHTML.match(/<article /g)||[]).length,1);
  p.media.matches=true;
  // Missing next day takes the same empty-state swipe path used on weekends.
  p.run('dayCache.set("2026-10-13",null)');await p.run('moveSelectedDay(1)');
  assert.equal(p.run('selectedDate'),'2026-10-13');assert.ok(p.elements.get('weekGrid').innerHTML.includes('등록된 식단'));
  p.run('currentFloor="10"');await p.elements.get('weekViewButton').listeners.click();assert.equal(p.run('currentFloor'),'all');
});

test('calendar month/year boundaries, leap month and Escape keyboard close',()=>{
  const p=page();p.run('selectedDate="2026-10-12";calendarMonth=new Date(2026,9,1,12);renderCalendar()');
  assert.equal((p.elements.get('calendarPanel').innerHTML.match(/class="calendar-day /g)||[]).length,31);
  p.run('calendarMonth=new Date(2024,1,1,12);renderCalendar()');
  assert.equal((p.elements.get('calendarPanel').innerHTML.match(/class="calendar-day /g)||[]).length,29);
  p.document.listeners.keydown({key:'Escape'});
  assert.ok(p.elements.get('calendarPanel').classList.contains('hidden'));
  assert.equal(p.elements.get('calendarButton').attrs['aria-expanded'],'false');
});

test('shared date and week actions preserve filters and synchronize the calendar',async()=>{
  const p=page();p.run('currentFloor="10"');
  await p.run('selectDay("2026-12-31")');
  assert.equal(p.run('selectedDate'),'2026-12-31');
  assert.equal(p.run('currentFloor'),'10');
  await p.run('moveWeek(1)');assert.equal(p.run('selectedDate'),'2027-01-07');
  await p.run('moveWeek(-1)');assert.equal(p.run('selectedDate'),'2026-12-31');
  p.run('setCalendarOpen(true)');
  assert.equal(p.elements.get('calendarButton').attrs['aria-expanded'],'true');
  assert.ok(p.elements.get('calendarPanel').innerHTML.includes('2026년 12월'));
  p.run('setCalendarOpen(false)');
  assert.ok(p.elements.get('calendarPanel').classList.contains('hidden'));
  assert.equal(p.elements.get('calendarButton').attrs['aria-expanded'],'false');
});

test('touch gesture thresholds ignore vertical and short gestures',()=>{
  const p=page();p.media.matches=true;
  p.run('var directions=[];moveSelectedDay=direction=>directions.push(direction)');
  const handlers=p.elements.get('weekGrid').listeners;
  const start=()=>handlers.touchstart({touches:[{clientX:200,clientY:200}]});
  start();handlers.touchend({changedTouches:[{clientX:190,clientY:200}]});
  start();handlers.touchend({changedTouches:[{clientX:100,clientY:20}]});
  start();handlers.touchend({changedTouches:[{clientX:100,clientY:205}]});
  start();handlers.touchend({changedTouches:[{clientX:300,clientY:205}]});
  assert.equal(p.run('directions.join(",")'),'1,-1');
});

test('animated swipe commits new date; interrupted animation preserves newer state',async()=>{
  for(const interrupt of [false,true]){
    const p=page();p.media.matches=true;p.reduced.matches=false;
    p.run('selectedDate="2026-10-12";currentMonday=mondayOf(parseKey(selectedDate));dayCache.set("2026-10-13",null)');
    let release;const finished=new Promise(resolve=>release=resolve);
    const outgoing=p.element(),incoming=p.element();let removed=false,replaced=false;
    outgoing.animate=()=>({finished});incoming.animate=()=>({finished:Promise.resolve()});incoming.remove=()=>removed=true;
    const grid=p.elements.get('weekGrid');grid.firstElementChild=outgoing;
    grid.appendChild=()=>{};grid.replaceChildren=()=>replaced=true;
    p.document.createElement=()=>({content:{firstElementChild:incoming},innerHTML:''});
    const swipe=p.run('moveSelectedDay(1)');await new Promise(resolve=>setImmediate(resolve));
    if(interrupt)p.run('renderSequence++;selectedDate="2026-10-16"');
    release();await swipe;
    assert.equal(p.run('selectedDate'),interrupt?'2026-10-16':'2026-10-13');
    assert.equal(replaced,!interrupt);assert.equal(removed,interrupt);
    assert.equal(p.run('isSwipeAnimating'),false);assert.ok(!grid.classList.contains('is-swiping'));
  }
});

test('theme start/end in Korea time, preview overrides and open-page expiry',()=>{
  const source=fs.readFileSync('themes/seasonal.js','utf8');
  for(const [date,query,expected] of [
    ['2026-10-17T23:59:59+09:00','',''],['2026-10-18T00:00:00+09:00','','autumn'],
    ['2026-11-17T23:59:59+09:00','','autumn'],['2026-11-18T00:00:00+09:00','',''],
    ['2027-01-01T00:00:00+09:00','?theme=autumn','autumn'],['2026-10-20T00:00:00+09:00','?theme=default','']]){
    let now=Date.parse(date),tick,visible,meta;
    const document={documentElement:{dataset:{}},querySelector:()=>({setAttribute:(k,v)=>meta=v}),addEventListener:(e,fn)=>visible=fn};
    vm.runInNewContext(source,{document,location:{search:query},URLSearchParams,Date:{now:()=>now,parse:Date.parse},setInterval:fn=>tick=fn});
    assert.equal(document.documentElement.dataset.theme||'',expected);assert.equal(meta,expected?'#F6EBDD':'#F7F5EF');
    if(!query){now=Date.parse('2026-11-18T00:00:00+09:00');tick();visible();assert.equal(document.documentElement.dataset.theme,undefined);}
  }
});

test('all referenced local resources exist and CSS contains no uncompiled Tailwind or emoji',()=>{
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"?]+)(?:\?[^\"]*)?"/g))assert.ok(fs.existsSync(match[1]),match[1]);
  const css=fs.readFileSync('assets/app.css','utf8');
  assert.ok(!/@apply\b/.test(css));
  for(const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)){
    if(!match[1].startsWith('data:'))assert.ok(fs.existsSync('assets/'+match[1]),match[1]);
  }
  assert.ok(!/\p{Extended_Pictographic}/u.test(html+css));
  const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
  for(const base of ['https://example.com/','https://example.com/SSAFY-Seoul-menu/']){
    assert.equal(new URL(manifest.start_url,base).href,base);
    for(const icon of manifest.icons)assert.ok(fs.existsSync(icon.src));
  }
});
