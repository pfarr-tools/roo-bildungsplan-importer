export function cleanText(input:string):string {
  return input.replace(/[\u00AD\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim();
}
export function parseNumberedTitle(text:string):{id:string;title:string}|null {
  const m=cleanText(text).match(/^(\d+(?:\.\d+)+)\s+(.+)$/); return m?{id:m[1],title:m[2].trim()}:null;
}
export function gradesFromLabel(label:string):number[]{
  const nums=[...label.matchAll(/\b(1[0-3]|[1-9])\b/g)].map(m=>Number(m[1]));
  if (/\b(\d+)\s*[-–/]\s*(\d+)\b/.test(label)) {
    const m=label.match(/\b(\d+)\s*[-–/]\s*(\d+)\b/)!; const a=+m[1],b=+m[2];
    return Array.from({length:b-a+1},(_,i)=>a+i);
  }
  return [...new Set(nums)];
}
export function courseFromLabel(label:string){
  if (/Basisfach/i.test(label)) return {id:'basic',label:'Basisfach'};
  if (/Leistungsfach/i.test(label)) return {id:'advanced',label:'Leistungsfach'};
  return null;
}
