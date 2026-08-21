import { readFile, writeFile } from 'node:fs/promises';

// 현재 index.html의 외부 20층 로더만 정확히 제거하고 로컬 통합 JSON 로더로 교체한다.
const filePath='index.html';
let html=await readFile(filePath,'utf8');

function replaceExact(before,after,label){
  if(!html.includes(before))throw new Error(`${label}: 기존 코드 블록을 찾지 못했습니다.`);
  html=html.replace(before,after);
}

replaceExact(
`const FLOOR20_BASE='https://raw.githubusercontent.com/C4T4767/baptimessafy/main/data/';
const LOCAL_DATA_BASE='./data/';`,
`const LOCAL_DATA_BASE='./data/';`,
'외부 20층 경로 제거'
);

replaceExact(
`function normalize20F(data){
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

    if(name||items.length)menus.push([name,meal?.courseName||'',items]);
  }
  return menus;
}

function makeDay(k,floor20=[],floor10=[]){
  return {...dateMeta(k),floors:{'20':floor20,'10':floor10}};
}

async function fetchDay(k){
  const [data20,localData]=await Promise.all([
    fetchJSON(\`${'${FLOOR20_BASE}'}${'${k}'}.json\`),
    fetchJSON(\`${'${LOCAL_DATA_BASE}'}${'${k}'}.json\`)
  ]);

  const floor20=normalize20F(data20);
  const floor10=floorMenus(localData,'10');

  if(!floor20.length&&!floor10.length)return null;
  return makeDay(k,floor20,floor10);
}`,
`async function fetchDay(k){
  const localData=await fetchJSON(\`${'${LOCAL_DATA_BASE}'}${'${k}'}.json\`);
  if(!localData)return null;

  const floor20=floorMenus(localData,'20');
  const floor10=floorMenus(localData,'10');
  if(!floor20.length&&!floor10.length)return null;

  return {
    ...dateMeta(k),
    ...localData,
    floors:{'20':floor20,'10':floor10}
  };
}`,
'20층 외부 변환 로직 제거 및 로컬 통합 로더 적용'
);

if(html.includes('FLOOR20_BASE'))throw new Error('FLOOR20_BASE가 남아 있습니다.');
if(html.includes('normalize20F'))throw new Error('normalize20F가 남아 있습니다.');
if(!html.includes("const LOCAL_DATA_BASE='./data/';"))throw new Error('LOCAL_DATA_BASE가 없습니다.');

await writeFile(filePath,html,'utf8');
console.log('index.html을 로컬 통합 JSON 방식으로 전환했습니다.');
