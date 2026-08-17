# Parser strategy

The current Baden-Württemberg site exposes a stable hierarchy: plan roots link to process-competency pages and content-domain pages; domain pages contain a numbered heading, an introduction, then either ordinary competency rows or differentiated G/M/E tables. The same pages also expose cross references and guidance/notes.

The importer deliberately uses several fallback selectors because CMS classes may change. Semantic cues are used only for structural roles (numbered headings, table headers, link relationship), never to assume a particular subject or domain vocabulary.

## IR

HTML is first converted to a neutral IR:

- `PlanIR`
- `ProcessDomainIR`
- `StageIR`
- `DomainIR`
- `CompetencyIR`
- `VariantIR`
- `ReferenceIR`
- `UnparsedBlockIR`

Only afterward does `transformPlan()` produce Roo JSON.

## Completeness rule

The importer is intentionally conservative. A plan is incomplete when, for example:

- a discovered content-domain page cannot be downloaded;
- a domain has no parseable competency positions despite containing competency-like text;
- duplicate stage/domain/competency IDs occur;
- table cells remain structurally unparsed;
- source links discovered from the plan root are omitted from the corpus.

Warnings are recorded in `validation.json`; errors force `complete: false` and a non-zero exit unless `--allow-incomplete` is used.
