export async function fetchHtml(url:string):Promise<string>{
  const r=await fetch(url,{headers:{'user-agent':'RooBildungsplanImporter/0.1 (+local educational data import)','accept':'text/html,application/xhtml+xml'}});
  if(!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const ct=r.headers.get('content-type')??''; if(!ct.includes('text/html')) throw new Error(`Expected HTML for ${url}, got ${ct}`);
  return await r.text();
}
