export type RefType = 'process_competency'|'content_competency'|'cross_subject'|'guideline'|'external_or_unknown';
export interface SourcePage { url:string; canonicalUrl:string; html:string; sha256:string; retrievedAt:string; kind:'root'|'process'|'content'|'other'; id?:string; title?:string }
export interface ReferenceIR { type:RefType; target?:string; targetPlan?:string; targetSubject?:string|null; raw:string; href?:string }
export interface VariantIR { level:string|null; text:string; references:ReferenceIR[]; raw:string }
export interface CompetencyIR { number:number; variants:VariantIR[]; sourceRaw:string }
export interface DomainIR { id:string; title:string; kind:'competency'|'note'; introduction:string|null; competencies:CompetencyIR[]; notesRaw:string[]; references:ReferenceIR[]; sourceRaw:string; sourceUrl:string; unparsed:string[] }
export interface StageIR { id:string; label:string; grades:number[]; course:{id:string;label:string}|null; levels:{id:string;label:string}[]; domains:DomainIR[] }
export interface ProcessCompetencyIR { id:string; number:number; text:string; references:ReferenceIR[] }
export interface ProcessDomainIR { id:string; title:string; competencies:ProcessCompetencyIR[]; sourceUrl:string; sourceRaw:string; unparsed:string[] }
export interface PlanIR { rootUrl:string; title:string; subject:string; planCode:string; schoolType:string|null; guidingPrinciples:{title:string;text:string;sourceUrl:string}[]; processDomains:ProcessDomainIR[]; stages:StageIR[]; sourcePages:SourcePage[]; diagnostics:string[] }
