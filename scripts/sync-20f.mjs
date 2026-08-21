import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SOURCE_API='https://api.github.com/repos/C4T4767/baptimessafy/contents/data?ref=main';
const DATA_DIR='data';
const DAY_MS=24*60*60*1000;
const PAST_DAYS=14;
const FUTURE_DAYS=21;
const weekdays=['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
const englishWeekdays=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const dayCodes=['sun','mon','tue','wed','thu','fri','sat'];

const parseDate=date=>new Date(`${date}T12:00:00+09:00`);
const dateKey=date=>{
  const y=date.getUTCFullYear();
  const m=String(date.getUTCMonth()+1).padStart(2,'0');
  const d=String(date.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
};

function dateMeta(date){
  const d=parseDate(date);
  const day=d.getUTCDay();
  return {
    date,
    dayCode:dayCodes[day],
    dateLabel:`${d.getUTCMonth()+1}월 ${d.getUTCDate()}일`,
    weekdayLabel:`${weekdays[day]} · ${englishWeekdays[day]}`
  };
}

function normalize20F(data){
  if(!Array.isArray(data?.meals))return [];
  const menus=[];

  for(const meal of data.meals){
    const nutrition=Array.isArray(meal?.nutrition)?meal.nutrition:[];
    let mainName='';
    const items=[];

    for(const item of nutrition){
      const itemName=item?.name;
      if(!itemName)continue;
      if(item?.isMain&&!mainName)mainName=itemName;
      else if(!item?.isMain)items.push(itemName);
    }

    const name=mainName||meal?.name||'';
    if(!nutrition.length&&meal?.setName){
      items.push(...String(meal.setName)
        .split('&')
        .map(item=>item.trim())
        .filter(item=>item&&item!==name));
    }

    const type=String(meal?.courseName||'').replace(':',' ').trim();
    if(name||items.length)menus.push([name,type,items]);
  }

  return menus;
}

async function fetchJSON(url){
  const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function readLocal(filePath){
  if(!existsSync(filePath))return null;
  return JSON.parse(await readFile(filePath,'utf8'));
}

await mkdir(DATA_DIR,{recursive:true});

const now=new Date();
const todayKST=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Seoul'}));
const minDate=new Date(todayKST.getTime()-PAST_DAYS*DAY_MS);
const maxDate=new Date(todayKST.getTime()+FUTURE_DAYS*DAY_MS);
const minKey=dateKey(minDate);
const maxKey=dateKey(maxDate);

const files=await fetchJSON(SOURCE_API);
const targets=files
  .filter(file=>file.type==='file'&&/^\d{4}-\d{2}-\d{2}\.json$/.test(file.name))
  .map(file=>({...file,date:file.name.slice(0,10)}))
  .filter(file=>file.date>=minKey&&file.date<=maxKey)
  .sort((a,b)=>a.date.localeCompare(b.date));

const touchedDates=new Set();

for(const file of targets){
  const source=await fetchJSON(file.download_url);
  const floor20=normalize20F(source);
  if(!floor20.length)continue;

  const filePath=path.join(DATA_DIR,file.name);
  const current=await readLocal(filePath);
  const meta=dateMeta(file.date);
  const next={
    ...meta,
    ...(current&&typeof current==='object'?current:{}),
    ...meta,
    floors:{
      ...(current?.floors&&typeof current.floors==='object'?current.floors:{}),
      '20':floor20
    }
  };

  const serialized=`${JSON.stringify(next,null,2)}\n`;
  const previous=current?`${JSON.stringify(current,null,2)}\n`:'';
  if(serialized!==previous){
    await writeFile(filePath,serialized,'utf8');
    touchedDates.add(file.date);
  }
}

const indexPath=path.join(DATA_DIR,'index.json');
const currentIndex=await readLocal(indexPath);
const dates=new Set(Array.isArray(currentIndex?.dates)?currentIndex.dates:[]);
for(const file of targets){
  if(existsSync(path.join(DATA_DIR,file.name)))dates.add(file.date);
}
const nextIndex={dates:[...dates].sort()};
const nextIndexText=`${JSON.stringify(nextIndex,null,2)}\n`;
const currentIndexText=currentIndex?`${JSON.stringify(currentIndex,null,2)}\n`:'';
if(nextIndexText!==currentIndexText)await writeFile(indexPath,nextIndexText,'utf8');

console.log(touchedDates.size
  ? `20층 식단 동기화: ${[...touchedDates].join(', ')}`
  : '20층 식단 변경 없음');
