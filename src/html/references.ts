import {cleanText} from '../util/text.js'; import type {ReferenceIR} from '../types.js';
export function referencesFromText(text:string):ReferenceIR[]{ const clean=cleanText(text); const result:ReferenceIR[]=[];
  for(const m of clean.matchAll(/\b(2\.\d+)\s*\(?\s*(\d+)\s*\)?/g)) result.push({type:'process_competency',target:`${m[1]}.${m[2]}`,targetPlan:'self',targetSubject:null,raw:m[0]});
  for(const m of clean.matchAll(/\b(3\.\d+\.\d+)\s*\(\s*(\d+)\s*\)/g)) result.push({type:'content_competency',target:`${m[1]}.${m[2]}`,targetPlan:'self',targetSubject:null,raw:m[0]});
  return dedupe(result);
}
export function referencesFromElement($:any,el:any):ReferenceIR[]{ const refs=referencesFromText($(el).text()); $(el).find('a[href]').each((_:any,a:any)=>{ const raw=cleanText($(a).text()); const href=$(a).attr('href'); if(!href)return; const known=referencesFromText(raw); if(known.length) refs.push(...known.map(x=>({...x,href}))); else if(/BP\d|_IK_|_PK_|BNE|BTV|MB|PG|VB|BO/.test(raw+href)) refs.push({type:'external_or_unknown',raw,href}); }); return dedupe(refs); }
function dedupe(xs:ReferenceIR[]){const m=new Map<string,ReferenceIR>(); for(const x of xs)m.set(`${x.type}|${x.target??''}|${x.href??''}|${x.raw}`,x); return [...m.values()]}
