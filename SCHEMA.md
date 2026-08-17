# Roo EducationPlan Schema 2.0

The importer writes the same generic schema used for the existing Roo education-plan datasets.

## Root

```json
{
  "schema_version": "2.0.0",
  "type": "education_plan",
  "metadata": {},
  "guiding_principles": [],
  "process_competencies": [],
  "stages": []
}
```

### Domains are data

A stage has an ordered `domains` array. Domain names, count and semantics are never fixed by the schema:

```json
{
  "id": "3.1.1",
  "title": "Mensch",
  "introduction": "...",
  "competencies": [],
  "notes": {"raw": null, "bible_passages": [], "terms": [], "other": []},
  "source_raw": "..."
}
```

A future revision may rename, add or remove domains without a schema change.

## Competencies and variants

A numbered competency position is separated from its variants so G/M/E can be represented without duplicating identity:

```json
{
  "id": "3.1.1.1",
  "number": 1,
  "variants": [
    {"level": "G", "text": "...", "references": []},
    {"level": "M", "text": "...", "references": []},
    {"level": "E", "text": "...", "references": []}
  ]
}
```

Plans without levels use one variant with `level: null`.

## Stages

`grades`, `course`, `levels` and `domains` are all data:

```json
{
  "id": "3.5",
  "label": "Klassen 12/13 (Basisfach)",
  "grades": [12, 13],
  "course": {"id": "basic", "label": "Basisfach"},
  "levels": [],
  "domains": []
}
```

## References

References are first-class objects. The parser preserves both normalized target information and the original source representation where possible:

```json
{
  "type": "content_competency",
  "target_plan": "self",
  "target_subject": null,
  "target": "3.1.4.3",
  "raw": "3.1.4 (3)"
}
```

Unresolvable links are retained as `type: "external_or_unknown"` rather than discarded.

## Source provenance and completeness

`metadata.source` records the root URL, retrieval timestamp, page count and corpus hash. `metadata.conversion.complete` is set only by the validator. Any parser warning that may imply lost normative content keeps it `false`.
