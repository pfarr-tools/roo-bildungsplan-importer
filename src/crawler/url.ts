export function canonicalize(input:string):string {
  const u=new URL(input); u.hash=''; u.search='';
  u.pathname=u.pathname.replace(/^\/%2CLde/i,'/,Lde').replace(/^\/,%?2?Lde/i,'/,Lde');
  return u.toString();
}
export function extractPlanCode(url:string):string {
  const s=decodeURIComponent(new URL(url).pathname); const m=s.match(/,Lde\/([^/?#]+)/); if(!m) throw new Error(`Cannot detect plan code from ${url}`);
  return m[1];
}
export function isPlanInternalLink(rootCode:string, href:string):boolean {
  try { const p=decodeURIComponent(new URL(href,'https://www.bildungsplaene-bw.de').pathname); return p.includes(rootCode) && !/requestMode=PDF/.test(href); } catch { return false; }
}
