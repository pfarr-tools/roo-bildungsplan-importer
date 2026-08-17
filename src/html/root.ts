import * as cheerio from 'cheerio'; import {cleanText,parseNumberedTitle,gradesFromLabel,courseFromLabel} from '../util/text.js';
export interface RootDiscovery { title:string; subject:string; schoolType:string|null; processLinks:{id:string;title:string;url:string}[]; contentLinks:{stageId:string;stageLabel:string;grades:number[];course:{id:string;label:string}|null;domainId:string;domainTitle:string;url:string}[]; otherInternalLinks:string[] }
export function parseRoot(html:string,url:string):RootDiscovery {
  const $=cheerio.load(html); const h1=cleanText($('h1').first().text()); const dash=h1.indexOf(' - '); const schoolType=dash>=0?h1.slice(0,dash):null; const subject=dash>=0?h1.slice(dash+3):h1;
  const processLinks:any[]=[]; const contentLinks:any[]=[]; const other:string[]=[]; let currentStage:{stageId:string;stageLabel:string;grades:number[];course:any}|null=null;
  $('a').each((_,a)=>{ const text=cleanText($(a).text()); const href=$(a).attr('href'); if(!href)return; const abs=new URL(href,url).toString(); const nt=parseNumberedTitle(text);
    if(nt && /^2\.\d+$/.test(nt.id) && /_PK_\d+/.test(abs)) processLinks.push({id:nt.id,title:nt.title,url:abs});
    if(nt && /^3\.\d+\.\d+$/.test(nt.id) && /_IK_/.test(abs)) {
      if(!currentStage || !nt.id.startsWith(currentStage.stageId+'.')) currentStage={stageId:nt.id.split('.').slice(0,2).join('.'),stageLabel:nt.id.split('.').slice(0,2).join('.'),grades:[],course:null};
      contentLinks.push({...currentStage,domainId:nt.id,domainTitle:nt.title,url:abs});
    }
  });
  // Stage labels are often plain text, not anchors. Infer them from the text preceding the first domain link.
  const bodyText=cleanText($('body').text()); for(const c of contentLinks){ const re=new RegExp(`${c.stageId.replace('.','\\.')}\\s+([^0-9]{1,80}?)(?=3\\.${c.stageId.split('.')[1]}\\.1)`); const m=bodyText.match(re); if(m){c.stageLabel=cleanText(`${c.stageId} ${m[1]}`).replace(new RegExp('^'+c.stageId+'\\s*'),''); c.grades=gradesFromLabel(c.stageLabel); c.course=courseFromLabel(c.stageLabel);} }
  return {title:h1,subject,schoolType,processLinks:[...new Map(processLinks.map(x=>[x.url,x])).values()],contentLinks:[...new Map(contentLinks.map(x=>[x.url,x])).values()],otherInternalLinks:other};
}
